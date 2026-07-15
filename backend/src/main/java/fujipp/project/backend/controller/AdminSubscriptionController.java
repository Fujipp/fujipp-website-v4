package fujipp.project.backend.controller;

import fujipp.project.backend.billing.BillingClient;
import fujipp.project.backend.service.AdminAccessService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * Admin overrides of what a user already owns (renewal price, plan, status, period).
 * Enforces ADMIN, forwards to billing-service with the acting admin id.
 */
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminSubscriptionController {

    public record GrantRuntimeRequest(String subjectId, UUID runtimePlanId, UUID vpsSlotId) {}
    public record GrantFeatureRequest(String subjectId, UUID featureId, UUID priceId, String billingType) {}

    private final AdminAccessService adminAccess;
    private final BillingClient billing;

    @GetMapping("/users/{userId}/subscriptions")
    public ResponseEntity<String> userSubscriptions(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID userId) {
        adminAccess.requireAdmin(UUID.fromString(jwt.getSubject()));
        return json(billing.adminListUserSubscriptions(userId));
    }

    @PostMapping("/users/{userId}/subscriptions/runtime")
    public ResponseEntity<String> grantRuntime(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID userId,
            @RequestBody GrantRuntimeRequest request) {
        UUID adminId = UUID.fromString(jwt.getSubject());
        adminAccess.requireAdmin(adminId);
        return json(billing.adminGrantRuntime(adminId, userId, request.subjectId(),
            request.runtimePlanId(), request.vpsSlotId()));
    }

    @PostMapping("/users/{userId}/subscriptions/features")
    public ResponseEntity<String> grantFeature(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID userId,
            @RequestBody GrantFeatureRequest request) {
        UUID adminId = UUID.fromString(jwt.getSubject());
        adminAccess.requireAdmin(adminId);
        return json(billing.adminGrantFeature(adminId, userId, request.subjectId(),
            request.featureId(), request.priceId(), request.billingType()));
    }

    @PatchMapping("/subscriptions/runtime/{id}")
    public ResponseEntity<String> updateRuntime(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, @RequestBody String body) {
        UUID adminId = UUID.fromString(jwt.getSubject());
        adminAccess.requireAdmin(adminId);
        return json(billing.adminUpdateRuntimeSubscription(adminId, id, body));
    }

    @PatchMapping("/subscriptions/features/{id}")
    public ResponseEntity<String> updateFeature(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, @RequestBody String body) {
        UUID adminId = UUID.fromString(jwt.getSubject());
        adminAccess.requireAdmin(adminId);
        return json(billing.adminUpdateFeatureSubscription(adminId, id, body));
    }

    private ResponseEntity<String> json(String body) {
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON).body(body);
    }
}
