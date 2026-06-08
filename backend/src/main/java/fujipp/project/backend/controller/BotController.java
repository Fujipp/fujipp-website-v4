package fujipp.project.backend.controller;

import fujipp.project.backend.billing.BillingClient;
import fujipp.project.backend.dto.BotResponse;
import fujipp.project.backend.dto.CreateBotRequest;
import fujipp.project.backend.dto.UpdateBotRequest;
import fujipp.project.backend.runtime.RuntimeClient;
import fujipp.project.backend.service.BotService;
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

import java.util.List;
import java.util.UUID;

/** The authenticated user's bots (subjects). One user owns many bots. */
@RestController
@RequestMapping("/api/bots")
@RequiredArgsConstructor
public class BotController {

    private final BotService botService;
    private final BillingClient billing;
    private final RuntimeClient runtime;

    @GetMapping
    public ResponseEntity<List<BotResponse>> list(@AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return ResponseEntity.ok(botService.listBots(userId));
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

    /** Save config values for a bot the caller owns. */
    @PutMapping("/{botId}/config")
    public ResponseEntity<String> updateConfig(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID botId, @RequestBody String body) {
        UUID userId = UUID.fromString(jwt.getSubject());
        botService.assertOwnership(userId, botId);
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON).body(billing.updateBotConfig(botId.toString(), body));
    }

    // ── runtime control (proxied to the orchestrator) ───────────────────────────

    @PostMapping("/{botId}/start")
    public ResponseEntity<String> start(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID botId) {
        assertOwner(jwt, botId);
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON).body(runtime.start(botId.toString()));
    }

    @PostMapping("/{botId}/stop")
    public ResponseEntity<String> stop(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID botId) {
        assertOwner(jwt, botId);
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON).body(runtime.stop(botId.toString()));
    }

    @PostMapping("/{botId}/restart")
    public ResponseEntity<String> restart(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID botId) {
        assertOwner(jwt, botId);
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON).body(runtime.restart(botId.toString()));
    }

    @GetMapping("/{botId}/status")
    public ResponseEntity<String> status(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID botId) {
        assertOwner(jwt, botId);
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON).body(runtime.status(botId.toString()));
    }

    private void assertOwner(Jwt jwt, UUID botId) {
        botService.assertOwnership(UUID.fromString(jwt.getSubject()), botId);
    }
}
