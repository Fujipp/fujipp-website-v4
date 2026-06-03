package fujipp.project.billing.service;

import fujipp.project.billing.dto.FeaturePriceResponse;
import fujipp.project.billing.dto.FeatureResponse;
import fujipp.project.billing.dto.RuntimePlanResponse;
import fujipp.project.billing.model.FeaturePrice;
import fujipp.project.billing.repository.FeatureCatalogRepository;
import fujipp.project.billing.repository.FeaturePriceRepository;
import fujipp.project.billing.repository.RuntimePlanRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Read-only storefront. Returns active features (with their priced SKUs) and
 * runtime plans, resolving the effective price against any live promotion.
 */
@Service
@RequiredArgsConstructor
public class BillingCatalogService {

    private final FeatureCatalogRepository featureRepository;
    private final FeaturePriceRepository priceRepository;
    private final RuntimePlanRepository runtimePlanRepository;

    @Transactional(readOnly = true)
    public List<FeatureResponse> listFeatures() {
        OffsetDateTime now = OffsetDateTime.now();

        Map<UUID, List<FeaturePrice>> pricesByFeature = priceRepository.findByActiveTrue()
            .stream()
            .collect(Collectors.groupingBy(FeaturePrice::getFeatureId));

        return featureRepository.findByActiveTrueOrderBySortOrderAsc().stream()
            .map(feature -> {
                List<FeaturePriceResponse> prices = pricesByFeature
                    .getOrDefault(feature.getId(), List.of())
                    .stream()
                    .map(price -> toPriceResponse(price, now))
                    .toList();
                return FeatureResponse.from(feature, prices);
            })
            .toList();
    }

    @Transactional(readOnly = true)
    public List<RuntimePlanResponse> listRuntimePlans() {
        OffsetDateTime now = OffsetDateTime.now();
        return runtimePlanRepository.findByActiveTrueOrderBySortOrderAsc().stream()
            .map(plan -> {
                boolean onPromo = Pricing.onPromotion(plan.getPromotionPriceSatang(),
                    plan.getPromotionStartsAt(), plan.getPromotionEndsAt(), now);
                long effective = Pricing.effectiveSatang(plan.getPriceSatang(),
                    plan.getPromotionPriceSatang(), plan.getPromotionStartsAt(),
                    plan.getPromotionEndsAt(), now);
                return RuntimePlanResponse.from(plan, effective, onPromo);
            })
            .toList();
    }

    private FeaturePriceResponse toPriceResponse(FeaturePrice price, OffsetDateTime now) {
        boolean onPromo = Pricing.onPromotion(price.getPromotionPriceSatang(),
            price.getPromotionStartsAt(), price.getPromotionEndsAt(), now);
        long effective = Pricing.effectiveSatang(price.getPriceSatang(),
            price.getPromotionPriceSatang(), price.getPromotionStartsAt(),
            price.getPromotionEndsAt(), now);
        return FeaturePriceResponse.from(price, effective, onPromo);
    }
}
