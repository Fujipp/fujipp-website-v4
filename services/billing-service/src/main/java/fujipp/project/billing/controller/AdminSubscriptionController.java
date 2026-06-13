package fujipp.project.billing.controller;

import fujipp.project.billing.dto.AdminUpdateFeatureSubscriptionRequest;
import fujipp.project.billing.dto.AdminUpdateRuntimeSubscriptionRequest;
import fujipp.project.billing.dto.AdminUserSubscriptionsResponse;
import fujipp.project.billing.dto.FeatureSubscriptionResponse;
import fujipp.project.billing.dto.RuntimeSubscriptionResponse;
import fujipp.project.billing.service.AdminSubscriptionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * Internal admin subscription overrides. Service-token guarded; the acting admin id
 * arrives in {@code X-Admin-Id} for the audit trail.
 */
@RestController
@RequestMapping("/api/billing/admin/subscriptions")
@RequiredArgsConstructor
public class AdminSubscriptionController {

    private final AdminSubscriptionService subscriptions;

    @GetMapping
    public ResponseEntity<AdminUserSubscriptionsResponse> forUser(@RequestParam("userId") UUID userId) {
        return ResponseEntity.ok(subscriptions.listForUser(userId));
    }

    @PatchMapping("/runtime/{id}")
    public ResponseEntity<RuntimeSubscriptionResponse> updateRuntime(
            @RequestHeader("X-Admin-Id") UUID adminId,
            @PathVariable UUID id,
            @RequestBody AdminUpdateRuntimeSubscriptionRequest request) {
        return ResponseEntity.ok(subscriptions.updateRuntime(adminId, id, request));
    }

    @PatchMapping("/features/{id}")
    public ResponseEntity<FeatureSubscriptionResponse> updateFeature(
            @RequestHeader("X-Admin-Id") UUID adminId,
            @PathVariable UUID id,
            @RequestBody AdminUpdateFeatureSubscriptionRequest request) {
        return ResponseEntity.ok(subscriptions.updateFeature(adminId, id, request));
    }
}
