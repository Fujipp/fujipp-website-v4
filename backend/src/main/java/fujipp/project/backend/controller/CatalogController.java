package fujipp.project.backend.controller;

import fujipp.project.backend.billing.BillingClient;
import fujipp.project.backend.service.BotService;
import fujipp.project.backend.service.ProfileService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Shop catalog for the authenticated user. Thin pass-through to billing-service
 * (the JSON is forwarded as-is so new fields flow through without a redeploy here).
 */
@RestController
@RequestMapping("/api/catalog")
@RequiredArgsConstructor
public class CatalogController {

    private final BillingClient billing;
    private final ProfileService profiles;
    private final BotService bots;

    public record ShopOverviewResponse(long users, long bots) {}

    @GetMapping("/overview")
    public ResponseEntity<ShopOverviewResponse> overview() {
        return ResponseEntity.ok(new ShopOverviewResponse(profiles.countProfiles(), bots.countBots()));
    }

    @GetMapping("/features")
    public ResponseEntity<String> features() {
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON).body(billing.listFeatures());
    }

    @GetMapping("/runtime-plans")
    public ResponseEntity<String> runtimePlans() {
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON).body(billing.listRuntimePlans());
    }
}
