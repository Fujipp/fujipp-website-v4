package fujipp.project.backend.controller;

import fujipp.project.backend.billing.BillingClient;
import fujipp.project.backend.dto.AdminBotResponse;
import fujipp.project.backend.dto.TransferBotRequest;
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

    private ResponseEntity<String> json(String body) {
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON).body(body);
    }
}
