package fujipp.project.billing.controller;

import fujipp.project.billing.dto.FeatureResponse;
import fujipp.project.billing.dto.RuntimePlanResponse;
import fujipp.project.billing.service.BillingCatalogService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/billing/catalog")
@RequiredArgsConstructor
public class CatalogController {

    private final BillingCatalogService catalogService;

    @GetMapping("/features")
    public ResponseEntity<List<FeatureResponse>> features() {
        return ResponseEntity.ok(catalogService.listFeatures());
    }

    @GetMapping("/runtime-plans")
    public ResponseEntity<List<RuntimePlanResponse>> runtimePlans() {
        return ResponseEntity.ok(catalogService.listRuntimePlans());
    }
}
