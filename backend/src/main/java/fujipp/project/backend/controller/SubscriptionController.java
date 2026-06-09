package fujipp.project.backend.controller;

import fujipp.project.backend.billing.BillingClient;
import fujipp.project.backend.dto.AutoRenewRequest;
import lombok.RequiredArgsConstructor;
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

import java.util.UUID;

/**
 * Lists the authenticated user's billing subscriptions through the main backend
 * so browser clients never call billing-service or hold its service token.
 */
@RestController
@RequestMapping("/api/subscriptions")
@RequiredArgsConstructor
public class SubscriptionController {

    private final BillingClient billing;

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

    @PostMapping("/features/{id}/renew")
    public ResponseEntity<String> renewFeature(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON)
            .body(billing.renewFeatureSubscription(userId, id));
    }
}
