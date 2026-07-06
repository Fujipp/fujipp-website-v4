package fujipp.project.backend.controller;

import fujipp.project.backend.billing.BillingClient;
import fujipp.project.backend.dto.AutoRenewRequest;
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
import org.springframework.web.bind.annotation.PatchMapping;
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
 * Lists the authenticated user's billing subscriptions through the main backend
 * so browser clients never call billing-service or hold its service token.
 */
@RestController
@RequestMapping("/api/subscriptions")
@RequiredArgsConstructor
public class SubscriptionController {

    private static final Logger log = LoggerFactory.getLogger(SubscriptionController.class);
    private static final Pattern SUBJECT = Pattern.compile("\"externalSubjectId\"\\s*:\\s*\"([^\"]+)\"");

    private final BillingClient billing;
    private final RuntimeClient runtime;
    private final RuntimeRouter runtimeRouter;

    @GetMapping("/features")
    public ResponseEntity<String> features(@AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return ResponseEntity.ok()
            .contentType(MediaType.APPLICATION_JSON)
            .body(billing.listFeatureSubscriptions(userId));
    }

    @GetMapping("/runtime")
    public ResponseEntity<String> runtime(@AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return ResponseEntity.ok()
            .contentType(MediaType.APPLICATION_JSON)
            .body(billing.listRuntimeSubscriptions(userId));
    }

    // ── runtime lifecycle (auto-renew toggle / renew now) ────────────────────────

    @PatchMapping("/runtime/{id}/auto-renew")
    public ResponseEntity<String> runtimeAutoRenew(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, @RequestBody AutoRenewRequest body) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON)
            .body(billing.setRuntimeAutoRenew(userId, id, body.autoRenew()));
    }

    @PostMapping("/runtime/{id}/renew")
    public ResponseEntity<String> renewRuntime(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON)
            .body(billing.renewRuntimeSubscription(userId, id));
    }

    // ── feature lifecycle (auto-renew toggle / renew now) ────────────────────────

    @PatchMapping("/features/{id}/auto-renew")
    public ResponseEntity<String> featureAutoRenew(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, @RequestBody AutoRenewRequest body) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON)
            .body(billing.setFeatureAutoRenew(userId, id, body.autoRenew()));
    }

    /**
     * Assign / move / unassign a feature subscription between the user's bots.
     * ENABLED_FEATURES is resolved at bot start, so after billing commits the move
     * we restart the affected online bots BEST EFFORT — a process-control failure
     * never fails the (already-committed) billing change.
     */
    @PostMapping("/features/{id}/assign")
    public ResponseEntity<String> assignFeature(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, @RequestBody String body) {
        UUID userId = UUID.fromString(jwt.getSubject());
        String previousBot = billing.featureSubs(userId).stream()
            .filter(sub -> id.equals(sub.id()))
            .findFirst()
            .map(BillingClient.FeatureSubView::externalSubjectId)
            .orElse(null);

        String result = billing.assignFeatureSubscription(userId, id, body);

        String newBot = subjectOf(result);
        java.util.Set<String> onlineBots = billing.runtimeSubs(userId).stream()
            .filter(r -> "ACTIVE".equals(r.status()) || "PAST_DUE".equals(r.status()))
            .map(BillingClient.RuntimeSubView::externalSubjectId)
            .filter(Objects::nonNull)
            .collect(java.util.stream.Collectors.toSet());
        tryRestart(previousBot, onlineBots);
        if (!Objects.equals(previousBot, newBot)) {
            tryRestart(newBot, onlineBots);
        }

        return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON).body(result);
    }

    private static String subjectOf(String json) {
        if (json == null) return null;
        Matcher m = SUBJECT.matcher(json);
        return m.find() ? m.group(1) : null;
    }

    /** Restart a bot so its ENABLED_FEATURES refresh — only if it should be online at all. */
    private void tryRestart(String botId, java.util.Set<String> onlineBots) {
        if (botId == null || !onlineBots.contains(botId)) return;
        try {
            UUID id = UUID.fromString(botId);
            runtime.restart(runtimeRouter.targetFor(id), botId);
        } catch (RuntimeException e) {
            log.warn("Best-effort restart for bot {} after feature assign failed", botId, e);
        }
    }

    @PostMapping("/features/{id}/renew")
    public ResponseEntity<String> renewFeature(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON)
            .body(billing.renewFeatureSubscription(userId, id));
    }
}
