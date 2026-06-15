package fujipp.project.backend.controller;

import fujipp.project.backend.service.BotRuntimeOps;
import fujipp.project.backend.service.BotService;
import fujipp.project.backend.service.ReviewCreditCountService;
import lombok.RequiredArgsConstructor;
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

import java.util.Map;
import java.util.UUID;

/**
 * Review-credit counter controls for a bot the caller owns: show the current count,
 * set it manually, or trigger a full recount (clears the counter so the bot re-counts
 * the whole channel on restart).
 */
@RestController
@RequestMapping("/api/bots/{botId}/review-credit")
@RequiredArgsConstructor
public class ReviewCreditController {

    private final BotService botService;
    private final ReviewCreditCountService counts;
    private final BotRuntimeOps runtimeOps;

    @GetMapping("/count")
    public ResponseEntity<Map<String, Object>> getCount(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID botId) {
        botService.assertOwnership(UUID.fromString(jwt.getSubject()), botId);
        return ResponseEntity.ok(counts.getCount(botId));
    }

    @PutMapping("/count")
    public ResponseEntity<Map<String, Object>> setCount(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID botId, @RequestBody SetCountRequest body) {
        botService.assertOwnership(UUID.fromString(jwt.getSubject()), botId);
        return ResponseEntity.ok(counts.setCount(botId, body.count()));
    }

    @PostMapping("/recount")
    public ResponseEntity<Map<String, Object>> recount(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID botId) {
        botService.assertOwnership(UUID.fromString(jwt.getSubject()), botId);
        counts.resetForRecount(botId);
        // Restart so the bot re-counts now; if it's stopped it will count on next start.
        runtimeOps.restartIfRunning(botId);
        return ResponseEntity.ok(Map.of("status", "recounting"));
    }

    public record SetCountRequest(long count) {}
}
