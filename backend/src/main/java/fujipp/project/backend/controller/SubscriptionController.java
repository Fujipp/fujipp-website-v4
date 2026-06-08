package fujipp.project.backend.controller;

import fujipp.project.backend.billing.BillingClient;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
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
}
