package fujipp.project.backend.controller;

import fujipp.project.backend.billing.BillingClient;
import fujipp.project.backend.runtime.RuntimeClient;
import fujipp.project.backend.runtime.RuntimeRouter;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Objects;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * The server-cabinet runtime flow (proxied to billing-service): browse VPS seats,
 * buy an unassigned duration plan for a seat, and assign/move it between the user's bots. Ownership and
 * seat/bot conflict checks live in billing; this layer just forwards the JWT user.
 *
 * After billing changes an assignment, this layer also nudges the orchestrator to
 * start/stop the affected bot processes — BEST EFFORT: a process call that fails
 * never fails the (already-committed, paid) billing change. Routing falls back to
 * the default VPS, so a bot with no node still starts on the primary host.
 */
@RestController
@RequestMapping("/api/runtime")
@RequiredArgsConstructor
public class RuntimeController {

    private static final Logger log = LoggerFactory.getLogger(RuntimeController.class);
    private static final Pattern SUBJECT = Pattern.compile("\"externalSubjectId\"\\s*:\\s*\"([^\"]+)\"");

    private final BillingClient billing;
    private final RuntimeClient runtime;
    private final RuntimeRouter runtimeRouter;

    @GetMapping("/vps")
    public ResponseEntity<String> vps(@AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return json(billing.listVps(userId));
    }

    @PostMapping("/slots/{slotId}/purchase")
    public ResponseEntity<String> purchase(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID slotId,
            @RequestBody String body) {
        UUID userId = UUID.fromString(jwt.getSubject());
        String result = billing.purchaseRuntimeSlot(userId, slotId, body);
        return json(result);
    }

    @PostMapping("/{runtimeId}/assign")
    public ResponseEntity<String> assign(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID runtimeId,
            @RequestBody String body) {
        UUID userId = UUID.fromString(jwt.getSubject());
        String previousBot = currentBotOf(userId, runtimeId);
        String result = billing.assignRuntime(userId, runtimeId, body);
        String newBot = subjectOf(result);
        // The bot that lost the runtime goes offline; the one that gained it comes online.
        if (!Objects.equals(previousBot, newBot)) {
            tryStop(previousBot);
            tryStart(newBot);
        }
        return json(result);
    }

    /** The bot a runtime is currently assigned to (before we change it), or null. */
    private String currentBotOf(UUID userId, UUID runtimeId) {
        // map() AFTER findFirst(): an unassigned runtime has a null externalSubjectId,
        // and Stream.findFirst() throws NPE on a null element (Optional.of). Optional.map
        // tolerates the null and collapses to empty → orElse(null).
        return billing.runtimeSubs(userId).stream()
            .filter(r -> runtimeId.equals(r.id()))
            .findFirst()
            .map(BillingClient.RuntimeSubView::externalSubjectId)
            .orElse(null);
    }

    private static String subjectOf(String runtimeJson) {
        if (runtimeJson == null) return null;
        Matcher m = SUBJECT.matcher(runtimeJson);
        return m.find() ? m.group(1) : null;
    }

    private void tryStart(String botId) {
        runtimeAction(botId, true);
    }

    private void tryStop(String botId) {
        runtimeAction(botId, false);
    }

    /** Best-effort start/stop — a process-control failure must not fail the billing change. */
    private void runtimeAction(String botId, boolean start) {
        if (botId == null || botId.isBlank()) return;
        try {
            UUID id = UUID.fromString(botId);
            if (start) {
                runtime.start(runtimeRouter.targetFor(id), botId);
            } else {
                runtime.stop(runtimeRouter.targetFor(id), botId);
            }
        } catch (RuntimeException e) {
            log.warn("Best-effort {} for bot {} failed", start ? "start" : "stop", botId, e);
        }
    }

    private static ResponseEntity<String> json(String body) {
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON).body(body);
    }
}
