package fujipp.project.backend.controller;

import fujipp.project.backend.billing.BillingClient;
import fujipp.project.backend.dto.AdminBotResponse;
import fujipp.project.backend.dto.AdminGrantBotFeatureRequest;
import fujipp.project.backend.dto.AdminGrantBotRuntimeRequest;
import fujipp.project.backend.dto.TransferBotRequest;
import fujipp.project.backend.runtime.RuntimeClient;
import fujipp.project.backend.runtime.RuntimeRouter;
import fujipp.project.backend.service.AdminAccessService;
import fujipp.project.backend.service.AdminBotService;
import fujipp.project.backend.service.EmbedConfigService;
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

/**
 * Admin bot directory + per-bot config. Lists every bot and lets an admin view/edit
 * any bot's feature config (proxied to billing-service, keyed by bot id = subject id).
 */
@RestController
@RequestMapping("/api/admin/bots")
@RequiredArgsConstructor
public class AdminBotController {

    private final AdminAccessService adminAccess;
    private final AdminBotService adminBots;
    private final BillingClient billing;
    private final EmbedConfigService embeds;
    private final RuntimeClient runtime;
    private final RuntimeRouter runtimeRouter;

    @GetMapping
    public ResponseEntity<List<AdminBotResponse>> list(@AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(adminBots.listBots(UUID.fromString(jwt.getSubject())));
    }

    @PostMapping("/{botId}/transfer")
    public ResponseEntity<AdminBotResponse> transfer(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID botId,
            @RequestBody @Valid TransferBotRequest request) {
        return ResponseEntity.ok(
            adminBots.transferBot(UUID.fromString(jwt.getSubject()), botId, request.newUserId()));
    }

    @GetMapping("/{botId}/config")
    public ResponseEntity<String> getConfig(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID botId) {
        adminAccess.requireAdmin(UUID.fromString(jwt.getSubject()));
        return json(billing.getBotConfig(botId.toString()));
    }

    @PutMapping("/{botId}/config")
    public ResponseEntity<String> updateConfig(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID botId, @RequestBody String body) {
        UUID adminId = UUID.fromString(jwt.getSubject());
        adminAccess.requireAdmin(adminId);
        String result = billing.updateBotConfig(botId.toString(), body);
        billing.recordAudit(adminId, "BOT_CONFIG_UPDATE", null, "BOT", botId.toString(),
            Map.of("botId", botId.toString()));
        return json(result);
    }

    // ── runtime control (proxied to the orchestrator; admin acts on any bot) ─────

    @PostMapping("/{botId}/start")
    public ResponseEntity<String> start(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID botId) {
        return runtimeControl(jwt, botId, "start");
    }

    @PostMapping("/{botId}/stop")
    public ResponseEntity<String> stop(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID botId) {
        return runtimeControl(jwt, botId, "stop");
    }

    @PostMapping("/{botId}/restart")
    public ResponseEntity<String> restart(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID botId) {
        return runtimeControl(jwt, botId, "restart");
    }

    @GetMapping("/{botId}/status")
    public ResponseEntity<String> status(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID botId) {
        adminAccess.requireAdmin(UUID.fromString(jwt.getSubject()));
        return runtimeAction(() -> runtime.status(runtimeRouter.targetFor(botId), botId.toString()));
    }

    // ── per-bot subscriptions (runtime + features for this bot) ──────────────────

    @GetMapping("/{botId}/subscriptions")
    public ResponseEntity<String> subscriptions(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID botId) {
        UUID ownerId = adminBots.requireBotOwner(UUID.fromString(jwt.getSubject()), botId);
        return json(billing.adminListUserSubscriptions(ownerId));
    }

    @PostMapping("/{botId}/runtime")
    public ResponseEntity<String> grantRuntime(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID botId,
            @RequestBody @Valid AdminGrantBotRuntimeRequest request) {
        UUID adminId = UUID.fromString(jwt.getSubject());
        UUID ownerId = adminBots.requireBotOwner(adminId, botId);
        return json(billing.adminGrantRuntime(adminId, ownerId, botId.toString(), request.runtimePlanId()));
    }

    @PostMapping("/{botId}/feature")
    public ResponseEntity<String> grantFeature(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID botId,
            @RequestBody @Valid AdminGrantBotFeatureRequest request) {
        UUID adminId = UUID.fromString(jwt.getSubject());
        UUID ownerId = adminBots.requireBotOwner(adminId, botId);
        return json(billing.adminGrantFeature(adminId, ownerId, botId.toString(),
            request.featureId(), request.priceId(), request.billingType()));
    }

    // ── embeds (any bot) ─────────────────────────────────────────────────────────

    @GetMapping("/{botId}/embeds")
    public ResponseEntity<String> listEmbeds(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID botId) {
        adminAccess.requireAdmin(UUID.fromString(jwt.getSubject()));
        return json(embeds.listEmbedsForAdmin(botId));
    }

    @GetMapping("/{botId}/embeds/{slotKey}")
    public ResponseEntity<String> getEmbed(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID botId, @PathVariable String slotKey) {
        adminAccess.requireAdmin(UUID.fromString(jwt.getSubject()));
        return json(embeds.getEmbedForAdmin(botId, slotKey));
    }

    @PutMapping("/{botId}/embeds/{slotKey}")
    public ResponseEntity<String> saveEmbed(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID botId,
            @PathVariable String slotKey, @RequestBody String body) {
        UUID adminId = UUID.fromString(jwt.getSubject());
        adminAccess.requireAdmin(adminId);
        String result = embeds.saveEmbedForAdmin(botId, slotKey, body);
        billing.recordAudit(adminId, "BOT_EMBED_UPDATE", null, "BOT", botId.toString(),
            Map.of("botId", botId.toString(), "slotKey", slotKey));
        return json(result);
    }

    /** Admin-gate, run a runtime action against the bot's host, and audit it. */
    private ResponseEntity<String> runtimeControl(Jwt jwt, UUID botId, String action) {
        UUID adminId = UUID.fromString(jwt.getSubject());
        adminAccess.requireAdmin(adminId);
        ResponseEntity<String> result = runtimeAction(() -> switch (action) {
            case "start"   -> runtime.start(runtimeRouter.targetFor(botId), botId.toString());
            case "stop"    -> runtime.stop(runtimeRouter.targetFor(botId), botId.toString());
            case "restart" -> runtime.restart(runtimeRouter.targetFor(botId), botId.toString());
            default -> throw new IllegalArgumentException(action);
        });
        if (result.getStatusCode().is2xxSuccessful()) {
            billing.recordAudit(adminId, "BOT_RUNTIME_" + action.toUpperCase(), null, "BOT", botId.toString(),
                Map.of("botId", botId.toString(), "action", action));
        }
        return result;
    }

    /** Forward the orchestrator's status + reason instead of a bare 500 (mirrors BotController). */
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

    private ResponseEntity<String> json(String body) {
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON).body(body);
    }

    @FunctionalInterface
    private interface RuntimeCall {
        String run();
    }
}
