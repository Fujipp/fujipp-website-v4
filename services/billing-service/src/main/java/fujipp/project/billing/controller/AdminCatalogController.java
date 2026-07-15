package fujipp.project.billing.controller;

import fujipp.project.billing.dto.AdminFeaturePriceResponse;
import fujipp.project.billing.dto.AdminRuntimePlanResponse;
import fujipp.project.billing.dto.CreateFeaturePriceRequest;
import fujipp.project.billing.dto.UpdateFeaturePriceRequest;
import fujipp.project.billing.dto.UpdateFeatureRequest;
import fujipp.project.billing.dto.FeatureResponse;
import fujipp.project.billing.dto.UpdateRuntimePlanRequest;
import fujipp.project.billing.dto.TemplateFieldResponse;
import fujipp.project.billing.service.AdminCatalogService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * Internal admin catalog API. Guarded by the service token (the main backend enforces
 * the ADMIN role before forwarding); the acting admin's id arrives in {@code X-Admin-Id}
 * for the audit trail.
 */
@RestController
@RequestMapping("/api/billing/admin/catalog")
@RequiredArgsConstructor
public class AdminCatalogController {

    private final AdminCatalogService catalog;

    @GetMapping("/runtime-plans")
    public ResponseEntity<List<AdminRuntimePlanResponse>> runtimePlans() {
        return ResponseEntity.ok(catalog.listRuntimePlans());
    }

    @PatchMapping("/runtime-plans/{id}")
    public ResponseEntity<AdminRuntimePlanResponse> updateRuntimePlan(
            @RequestHeader("X-Admin-Id") UUID adminId,
            @PathVariable UUID id,
            @RequestBody UpdateRuntimePlanRequest request) {
        return ResponseEntity.ok(catalog.updateRuntimePlan(adminId, id, request));
    }

    @GetMapping("/feature-prices")
    public ResponseEntity<List<AdminFeaturePriceResponse>> featurePrices() {
        return ResponseEntity.ok(catalog.listFeaturePrices());
    }

    @PatchMapping("/features/{id}")
    public ResponseEntity<FeatureResponse> updateFeature(
            @RequestHeader("X-Admin-Id") UUID adminId,
            @PathVariable UUID id,
            @RequestBody UpdateFeatureRequest request) {
        return ResponseEntity.ok(catalog.updateFeature(adminId, id, request));
    }

    @GetMapping("/features/{id}/fields")
    public ResponseEntity<List<TemplateFieldResponse>> featureFields(@PathVariable UUID id) {
        return ResponseEntity.ok(catalog.listFeatureFields(id));
    }

    @PatchMapping("/features/{featureId}/fields/{fieldId}")
    public ResponseEntity<TemplateFieldResponse> updateFeatureField(
            @RequestHeader("X-Admin-Id") UUID adminId,
            @PathVariable UUID featureId,
            @PathVariable UUID fieldId,
            @RequestBody UpdateFeatureRequest.FieldUpdate request) {
        return ResponseEntity.ok(catalog.updateFeatureField(adminId, featureId, fieldId, request));
    }

    @PostMapping("/feature-prices")
    public ResponseEntity<AdminFeaturePriceResponse> createFeaturePrice(
            @RequestHeader("X-Admin-Id") UUID adminId,
            @RequestBody CreateFeaturePriceRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(catalog.createFeaturePrice(adminId, request));
    }

    @PatchMapping("/feature-prices/{id}")
    public ResponseEntity<AdminFeaturePriceResponse> updateFeaturePrice(
            @RequestHeader("X-Admin-Id") UUID adminId,
            @PathVariable UUID id,
            @RequestBody UpdateFeaturePriceRequest request) {
        return ResponseEntity.ok(catalog.updateFeaturePrice(adminId, id, request));
    }
}
