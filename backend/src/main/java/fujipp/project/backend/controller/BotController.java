package fujipp.project.backend.controller;

import fujipp.project.backend.billing.BillingClient;
import fujipp.project.backend.dto.BotResponse;
import fujipp.project.backend.dto.CreateBotRequest;
import fujipp.project.backend.dto.UpdateBotRequest;
import fujipp.project.backend.runtime.RuntimeClient;
import fujipp.project.backend.runtime.RuntimeRouter;
import fujipp.project.backend.service.BotRuntimeOps;
import fujipp.project.backend.service.BotService;
import fujipp.project.backend.service.PlacementService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/** The authenticated user's bots (subjects). One user owns many bots. */
@RestController
@RequestMapping("/api/bots")
@RequiredArgsConstructor
public class BotController {

    private final BotService botService;
    private final BillingClient billing;
    private final RuntimeClient runtime;
    private final RuntimeRouter runtimeRouter;
    private final PlacementService placement;
    private final BotRuntimeOps runtimeOps;

    @GetMapping
    public ResponseEntity<List<BotResponse>> list(@AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return ResponseEntity.ok(botService.listBots(userId));
    }

    /** Free bot slots across all hosts — lets the UI show availability before buying. */
    @GetMapping("/capacity")
    public ResponseEntity<Map<String, Long>> capacity() {
        long free = placement.availableSlots();
        return ResponseEntity.ok(Map.of("availableSlots", free));
    }

    @PostMapping
    public ResponseEntity<BotResponse> create(
            @AuthenticationPrincipal Jwt jwt,
            @RequestBody @Valid CreateBotRequest request) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return ResponseEntity.ok(botService.createBot(userId, request));
    }

    /** Single bot details (no secrets) — used to prefill the edit form. */
    @GetMapping("/{botId}")
    public ResponseEntity<BotResponse> get(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID botId) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return ResponseEntity.ok(botService.getBot(userId, botId));
    }

    /** Update bot settings (name, credentials). Blank token/secret keeps the existing value. */
    @PutMapping("/{botId}")
    public ResponseEntity<BotResponse> update(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID botId,
            @RequestBody UpdateBotRequest request) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return ResponseEntity.ok(botService.updateBot(userId, botId, request));
    }

    /** Config form (features + values) for a bot the caller owns. */
    @GetMapping("/{botId}/config")
    public ResponseEntity<String> getConfig(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID botId) {
        UUID userId = UUID.fromString(jwt.getSubject());
        botService.assertOwnership(userId, botId);
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON).body(billing.getBotConfig(botId.toString()));
    }

    /**
     * Save config values for a bot the caller owns. Config is injected as env at process
     * start, so a running bot is restarted afterwards to pick up the new values (a stopped
     * bot is left alone). Best-effort: a restart failure does not fail the save.
     */
    @PutMapping("/{botId}/config")
    public ResponseEntity<String> updateConfig(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID botId, @RequestBody String body) {
        UUID userId = UUID.fromString(jwt.getSubject());
        botService.assertOwnership(userId, botId);
        String saved = billing.updateBotConfig(botId.toString(), body);
        runtimeOps.restartIfRunning(botId);
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON).body(saved);
    }

    // ── runtime control (proxied to the orchestrator) ───────────────────────────

    @PostMapping("/{botId}/start")
    public ResponseEntity<String> start(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID botId) {
        assertOwner(jwt, botId);
        return runtimeAction(() -> runtime.start(runtimeRouter.targetFor(botId), botId.toString()));
    }

    @PostMapping("/{botId}/stop")
    public ResponseEntity<String> stop(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID botId) {
        assertOwner(jwt, botId);
        return runtimeAction(() -> runtime.stop(runtimeRouter.targetFor(botId), botId.toString()));
    }

    @PostMapping("/{botId}/restart")
    public ResponseEntity<String> restart(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID botId) {
        assertOwner(jwt, botId);
        return runtimeAction(() -> runtime.restart(runtimeRouter.targetFor(botId), botId.toString()));
    }

    @GetMapping("/{botId}/status")
    public ResponseEntity<String> status(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID botId) {
        assertOwner(jwt, botId);
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON)
            .body(runtime.status(runtimeRouter.targetFor(botId), botId.toString()));
    }

    private void assertOwner(Jwt jwt, UUID botId) {
        botService.assertOwnership(UUID.fromString(jwt.getSubject()), botId);
    }

    private ResponseEntity<String> runtimeAction(RuntimeCall call) {
        try {
            return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON).body(call.run());
        } catch (ResponseStatusException e) {
            String reason = e.getReason() == null || e.getReason().isBlank()
                ? "runtime service rejected the request"
                : e.getReason();
            return ResponseEntity.status(e.getStatusCode())
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"error\":" + jsonString(reason) + "}");
        }
    }

    private static String jsonString(String value) {
        return "\"" + value
            .replace("\\", "\\\\")
            .replace("\"", "\\\"")
            .replace("\n", "\\n")
            .replace("\r", "\\r") + "\"";
    }

    @FunctionalInterface
    private interface RuntimeCall {
        String run();
    }
}
