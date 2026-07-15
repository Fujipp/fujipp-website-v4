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
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * Admin catalog pricing. Enforces the ADMIN role, then forwards to billing-service
 * (JSON passed through as-is so new fields flow without a redeploy here). The acting
 * admin's id is forwarded for the audit trail.
 */
@RestController
@RequestMapping("/api/admin/catalog")
@RequiredArgsConstructor
public class AdminCatalogController {

    private final AdminAccessService adminAccess;
    private final BillingClient billing;

    @GetMapping("/runtime-plans")
    public ResponseEntity<String> runtimePlans(@AuthenticationPrincipal Jwt jwt) {
        adminAccess.requireAdmin(UUID.fromString(jwt.getSubject()));
        return json(billing.adminListRuntimePlans());
    }

    @PatchMapping("/runtime-plans/{id}")
    public ResponseEntity<String> updateRuntimePlan(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, @RequestBody String body) {
        UUID adminId = UUID.fromString(jwt.getSubject());
        adminAccess.requireAdmin(adminId);
        return json(billing.adminUpdateRuntimePlan(adminId, id, body));
    }

    /** All catalog features (incl. unpriced) so the admin can pick one to price. */
    @GetMapping("/features")
    public ResponseEntity<String> features(@AuthenticationPrincipal Jwt jwt) {
        adminAccess.requireAdmin(UUID.fromString(jwt.getSubject()));
        return json(billing.listFeatures());
    }

    @GetMapping("/feature-prices")
    public ResponseEntity<String> featurePrices(@AuthenticationPrincipal Jwt jwt) {
        adminAccess.requireAdmin(UUID.fromString(jwt.getSubject()));
        return json(billing.adminListFeaturePrices());
    }

    @PatchMapping("/features/{id}")
    public ResponseEntity<String> updateFeature(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, @RequestBody String body) {
        UUID adminId = UUID.fromString(jwt.getSubject());
        adminAccess.requireAdmin(adminId);
        return json(billing.adminUpdateFeature(adminId, id, body));
    }

    @GetMapping("/features/{id}/fields")
    public ResponseEntity<String> featureFields(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        adminAccess.requireAdmin(UUID.fromString(jwt.getSubject()));
        return json(billing.adminListFeatureFields(id));
    }

    @PatchMapping("/features/{featureId}/fields/{fieldId}")
    public ResponseEntity<String> updateFeatureField(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID featureId,
            @PathVariable UUID fieldId,
            @RequestBody String body) {
        UUID adminId = UUID.fromString(jwt.getSubject());
        adminAccess.requireAdmin(adminId);
        return json(billing.adminUpdateFeatureField(adminId, featureId, fieldId, body));
    }

    @PostMapping("/feature-prices")
    public ResponseEntity<String> createFeaturePrice(
            @AuthenticationPrincipal Jwt jwt, @RequestBody String body) {
        UUID adminId = UUID.fromString(jwt.getSubject());
        adminAccess.requireAdmin(adminId);
        return json(billing.adminCreateFeaturePrice(adminId, body));
    }

    @PatchMapping("/feature-prices/{id}")
    public ResponseEntity<String> updateFeaturePrice(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, @RequestBody String body) {
        UUID adminId = UUID.fromString(jwt.getSubject());
        adminAccess.requireAdmin(adminId);
        return json(billing.adminUpdateFeaturePrice(adminId, id, body));
    }

    private ResponseEntity<String> json(String body) {
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON).body(body);
    }
}
