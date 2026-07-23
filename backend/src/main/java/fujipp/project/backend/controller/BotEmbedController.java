package fujipp.project.backend.controller;

import fujipp.project.backend.service.EmbedConfigService;
import fujipp.project.backend.service.BotRuntimeOps;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/** Configurable embeds for a bot the caller owns (config layer 3). */
@RestController
@RequestMapping("/api/bots/{botId}/embeds")
@RequiredArgsConstructor
public class BotEmbedController {

    private final EmbedConfigService embeds;
    private final BotRuntimeOps runtimeOps;

    /** All embed slots with their effective embed (override or default). */
    @GetMapping
    public ResponseEntity<String> list(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID botId) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON).body(embeds.listEmbeds(userId, botId));
    }

    /** The effective embed JSON for one slot. */
    @GetMapping("/{slotKey}")
    public ResponseEntity<String> get(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID botId, @PathVariable String slotKey) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON).body(embeds.getEmbed(userId, botId, slotKey));
    }

    /** Save the bot's override for one slot. Body is the embed JSON object. */
    @PutMapping("/{slotKey}")
    public ResponseEntity<String> save(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID botId, @PathVariable String slotKey,
            @RequestBody String body) {
        UUID userId = UUID.fromString(jwt.getSubject());
        String saved = embeds.saveEmbed(userId, botId, slotKey, body);
        runtimeOps.restartIfRunning(botId);
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON).body(saved);
    }

    @DeleteMapping("/{slotKey}")
    public ResponseEntity<String> reset(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID botId, @PathVariable String slotKey) {
        UUID userId = UUID.fromString(jwt.getSubject());
        String result = embeds.resetEmbed(userId, botId, slotKey);
        runtimeOps.restartIfRunning(botId);
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON).body(result);
    }
}
