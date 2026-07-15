package fujipp.project.billing.service;

import fujipp.project.billing.dto.AdminFeaturePriceResponse;
import fujipp.project.billing.dto.AdminRuntimePlanResponse;
import fujipp.project.billing.dto.CreateFeaturePriceRequest;
import fujipp.project.billing.dto.UpdateFeaturePriceRequest;
import fujipp.project.billing.dto.UpdateFeatureRequest;
import fujipp.project.billing.dto.FeatureResponse;
import fujipp.project.billing.dto.UpdateRuntimePlanRequest;
import fujipp.project.billing.dto.TemplateFieldResponse;
import fujipp.project.billing.model.FeatureCatalog;
import fujipp.project.billing.model.FeaturePrice;
import fujipp.project.billing.model.RuntimePlan;
import fujipp.project.billing.model.FeatureVariableTemplate;
import fujipp.project.billing.repository.FeatureCatalogRepository;
import fujipp.project.billing.repository.FeaturePriceRepository;
import fujipp.project.billing.repository.RuntimePlanRepository;
import fujipp.project.billing.repository.FeatureVariableTemplateRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;

/** Admin catalog pricing: list everything (incl. inactive) and apply partial updates with an audit trail. */
@Service
@RequiredArgsConstructor
public class AdminCatalogService {

    private final RuntimePlanRepository runtimePlans;
    private final FeaturePriceRepository featurePrices;
    private final FeatureCatalogRepository features;
    private final FeatureVariableTemplateRepository featureFields;
    private final AdminAuditService audit;

    // ── runtime plans ────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<AdminRuntimePlanResponse> listRuntimePlans() {
        return runtimePlans.findAll().stream()
            .sorted(Comparator.comparingInt(RuntimePlan::getSortOrder).thenComparing(RuntimePlan::getName))
            .map(AdminRuntimePlanResponse::from)
            .toList();
    }

    @Transactional
    public AdminRuntimePlanResponse updateRuntimePlan(UUID adminId, UUID planId, UpdateRuntimePlanRequest req) {
        RuntimePlan plan = runtimePlans.findById(planId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Runtime plan not found"));

        Map<String, Object> changes = new LinkedHashMap<>();
        if (req.name() != null && !req.name().equals(plan.getName())) {
            changes.put("name", List.of(plan.getName(), req.name()));
            plan.setName(req.name());
        }
        if (req.priceSatang() != null && req.priceSatang() != plan.getPriceSatang()) {
            requireNonNegative(req.priceSatang());
            changes.put("priceSatang", List.of(plan.getPriceSatang(), req.priceSatang()));
            plan.setPriceSatang(req.priceSatang());
        }
        if (req.durationMonths() != null && req.durationMonths() != plan.getDurationMonths()) {
            requirePositive(req.durationMonths(), "durationMonths");
            changes.put("durationMonths", List.of(plan.getDurationMonths(), req.durationMonths()));
            plan.setDurationMonths(req.durationMonths());
        }
        if (req.featured() != null && req.featured() != plan.isFeatured()) {
            changes.put("featured", List.of(plan.isFeatured(), req.featured()));
            plan.setFeatured(req.featured());
        }
        if (req.sortOrder() != null && req.sortOrder() != plan.getSortOrder()) {
            changes.put("sortOrder", List.of(plan.getSortOrder(), req.sortOrder()));
            plan.setSortOrder(req.sortOrder());
        }
        if (req.active() != null && req.active() != plan.isActive()) {
            changes.put("active", List.of(plan.isActive(), req.active()));
            plan.setActive(req.active());
        }
        applyPromotion(req.clearPromotion(), req.promotionLabel(), req.promotionPriceSatang(),
            req.promotionStartsAt(), req.promotionEndsAt(), changes,
            plan::getPromotionPriceSatang,
            plan::setPromotionLabel, plan::setPromotionPriceSatang,
            plan::setPromotionStartsAt, plan::setPromotionEndsAt);

        RuntimePlan saved = runtimePlans.save(plan);
        if (!changes.isEmpty()) {
            audit.record(adminId, "CATALOG_PRICE_UPDATE", null, "RUNTIME_PLAN", planId.toString(), changes);
        }
        return AdminRuntimePlanResponse.from(saved);
    }

    // ── feature prices ─────────────────────────────────────────────────────────────

    @Transactional
    public FeatureResponse updateFeature(UUID adminId, UUID featureId, UpdateFeatureRequest req) {
        FeatureCatalog feature = features.findById(featureId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Feature not found"));
        Map<String, Object> changes = new LinkedHashMap<>();
        if (req.name() != null && !req.name().isBlank() && !req.name().equals(feature.getName())) {
            changes.put("name", List.of(feature.getName(), req.name()));
            feature.setName(req.name().trim());
        }
        if (req.description() != null && !req.description().equals(feature.getDescription())) {
            changes.put("description", List.of(feature.getDescription(), req.description()));
            feature.setDescription(req.description().trim());
        }
        if (req.iconKey() != null && !req.iconKey().isBlank() && !req.iconKey().equals(feature.getIconKey())) {
            changes.put("iconKey", List.of(feature.getIconKey(), req.iconKey()));
            feature.setIconKey(req.iconKey().trim());
        }
        FeatureCatalog saved = features.save(feature);
        if (!changes.isEmpty()) audit.record(adminId, "CATALOG_FEATURE_UPDATE", null, "FEATURE", featureId.toString(), changes);
        return FeatureResponse.from(saved, List.of());
    }

    @Transactional(readOnly = true)
    public List<TemplateFieldResponse> listFeatureFields(UUID featureId) {
        if (!features.existsById(featureId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Feature not found");
        }
        return featureFields.findByFeatureIdOrderBySortOrder(featureId).stream()
            .map(TemplateFieldResponse::from)
            .toList();
    }

    @Transactional
    public TemplateFieldResponse updateFeatureField(
            UUID adminId, UUID featureId, UUID fieldId, UpdateFeatureRequest.FieldUpdate req) {
        FeatureVariableTemplate field = featureFields.findById(fieldId)
            .filter(item -> item.getFeatureId().equals(featureId))
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Feature field not found"));

        Map<String, Object> changes = new LinkedHashMap<>();
        if (req.label() != null && !req.label().isBlank() && !req.label().equals(field.getLabel())) {
            changes.put("label", List.of(field.getLabel(), req.label().trim()));
            field.setLabel(req.label().trim());
        }
        if (req.description() != null && !req.description().equals(field.getDescription())) {
            changes.put("description", java.util.Arrays.asList(field.getDescription(), req.description()));
            field.setDescription(req.description().trim());
        }
        if (req.valueType() != null && !req.valueType().isBlank() && !req.valueType().equals(field.getValueType())) {
            changes.put("valueType", List.of(field.getValueType(), req.valueType()));
            field.setValueType(req.valueType().trim().toUpperCase());
        }
        if (req.required() != null && req.required() != field.isRequired()) {
            changes.put("required", List.of(field.isRequired(), req.required()));
            field.setRequired(req.required());
        }
        if (req.sensitive() != null && req.sensitive() != field.isSensitive()) {
            changes.put("sensitive", List.of(field.isSensitive(), req.sensitive()));
            field.setSensitive(req.sensitive());
        }
        if (req.defaultValue() != null && !req.defaultValue().equals(field.getDefaultValue())) {
            changes.put("defaultValue", java.util.Arrays.asList(field.getDefaultValue(), req.defaultValue()));
            field.setDefaultValue(req.defaultValue());
        }
        if (req.options() != null && !req.options().equals(field.getOptions())) {
            changes.put("options", java.util.Arrays.asList(field.getOptions(), req.options()));
            field.setOptions(req.options().isBlank() ? null : req.options());
        }
        if (req.sortOrder() != null && req.sortOrder() != field.getSortOrder()) {
            changes.put("sortOrder", List.of(field.getSortOrder(), req.sortOrder()));
            field.setSortOrder(req.sortOrder());
        }

        FeatureVariableTemplate saved = featureFields.save(field);
        if (!changes.isEmpty()) {
            audit.record(adminId, "CATALOG_FEATURE_FIELD_UPDATE", null, "FEATURE_FIELD", fieldId.toString(), changes);
        }
        return TemplateFieldResponse.from(saved);
    }

    /** Valid price kinds — mirrors feature_prices_kind_chk. */
    private static final Set<String> PRICE_KINDS = Set.of("RENT_MONTHLY", "RENT_PERMANENT", "SOURCE_CODE");

    @Transactional
    public AdminFeaturePriceResponse createFeaturePrice(UUID adminId, CreateFeaturePriceRequest req) {
        if (req.featureId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "featureId is required");
        }
        if (req.kind() == null || !PRICE_KINDS.contains(req.kind())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "kind must be one of " + PRICE_KINDS);
        }
        if (req.priceSatang() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "priceSatang is required");
        }
        requireNonNegative(req.priceSatang());

        FeatureCatalog feature = features.findById(req.featureId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Feature not found"));

        if (featurePrices.existsByFeatureIdAndKind(feature.getId(), req.kind())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "A " + req.kind() + " price already exists for this feature");
        }

        FeaturePrice price = new FeaturePrice();
        price.setFeatureId(feature.getId());
        price.setKind(req.kind());
        price.setPriceSatang(req.priceSatang());
        price.setCurrency("THB");
        // Monthly rents need a duration; permanent / source-code are open-ended.
        if ("RENT_MONTHLY".equals(req.kind())) {
            int months = req.durationMonths() != null ? req.durationMonths() : 1;
            requirePositive(months, "durationMonths");
            price.setDurationMonths(months);
        } else {
            price.setDurationMonths(req.durationMonths());
        }
        price.setActive(req.active() == null || req.active());

        if (req.promotionPriceSatang() != null) {
            requireNonNegative(req.promotionPriceSatang());
            price.setPromotionPriceSatang(req.promotionPriceSatang());
        }
        if (req.promotionLabel() != null) price.setPromotionLabel(req.promotionLabel());
        if (req.promotionStartsAt() != null) price.setPromotionStartsAt(req.promotionStartsAt());
        if (req.promotionEndsAt() != null) price.setPromotionEndsAt(req.promotionEndsAt());

        FeaturePrice saved = featurePrices.save(price);

        Map<String, Object> changes = new LinkedHashMap<>();
        changes.put("featureCode", feature.getCode());
        changes.put("kind", saved.getKind());
        changes.put("priceSatang", saved.getPriceSatang());
        changes.put("durationMonths", saved.getDurationMonths());
        changes.put("active", saved.isActive());
        audit.record(adminId, "CATALOG_PRICE_CREATE", null, "FEATURE_PRICE", saved.getId().toString(), changes);

        return AdminFeaturePriceResponse.from(saved, feature.getCode(), feature.getName());
    }

    @Transactional(readOnly = true)
    public List<AdminFeaturePriceResponse> listFeaturePrices() {
        Map<UUID, FeatureCatalog> byId = features.findAll().stream()
            .collect(java.util.stream.Collectors.toMap(FeatureCatalog::getId, Function.identity()));
        return featurePrices.findAll().stream()
            .map(price -> {
                FeatureCatalog f = byId.get(price.getFeatureId());
                return AdminFeaturePriceResponse.from(price,
                    f != null ? f.getCode() : null,
                    f != null ? f.getName() : null);
            })
            .sorted(Comparator.comparing(AdminFeaturePriceResponse::featureName,
                    Comparator.nullsLast(Comparator.naturalOrder()))
                .thenComparing(AdminFeaturePriceResponse::kind))
            .toList();
    }

    @Transactional
    public AdminFeaturePriceResponse updateFeaturePrice(UUID adminId, UUID priceId, UpdateFeaturePriceRequest req) {
        FeaturePrice price = featurePrices.findById(priceId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Feature price not found"));

        Map<String, Object> changes = new LinkedHashMap<>();
        if (req.priceSatang() != null && req.priceSatang() != price.getPriceSatang()) {
            requireNonNegative(req.priceSatang());
            changes.put("priceSatang", List.of(price.getPriceSatang(), req.priceSatang()));
            price.setPriceSatang(req.priceSatang());
        }
        if (req.durationMonths() != null && !req.durationMonths().equals(price.getDurationMonths())) {
            changes.put("durationMonths", java.util.Arrays.asList(price.getDurationMonths(), req.durationMonths()));
            price.setDurationMonths(req.durationMonths());
        }
        if (req.active() != null && req.active() != price.isActive()) {
            changes.put("active", List.of(price.isActive(), req.active()));
            price.setActive(req.active());
        }
        applyPromotion(req.clearPromotion(), req.promotionLabel(), req.promotionPriceSatang(),
            req.promotionStartsAt(), req.promotionEndsAt(), changes,
            price::getPromotionPriceSatang,
            price::setPromotionLabel, price::setPromotionPriceSatang,
            price::setPromotionStartsAt, price::setPromotionEndsAt);

        FeaturePrice saved = featurePrices.save(price);
        FeatureCatalog f = features.findById(saved.getFeatureId()).orElse(null);
        if (!changes.isEmpty()) {
            audit.record(adminId, "CATALOG_PRICE_UPDATE", null, "FEATURE_PRICE", priceId.toString(), changes);
        }
        return AdminFeaturePriceResponse.from(saved,
            f != null ? f.getCode() : null, f != null ? f.getName() : null);
    }

    // ── helpers ─────────────────────────────────────────────────────────────────────

    private void applyPromotion(Boolean clearPromotion, String label, Long promoPrice,
                                java.time.OffsetDateTime startsAt, java.time.OffsetDateTime endsAt,
                                Map<String, Object> changes,
                                java.util.function.Supplier<Long> currentPromoPrice,
                                java.util.function.Consumer<String> setLabel,
                                java.util.function.Consumer<Long> setPromoPrice,
                                java.util.function.Consumer<java.time.OffsetDateTime> setStartsAt,
                                java.util.function.Consumer<java.time.OffsetDateTime> setEndsAt) {
        Long before = currentPromoPrice.get();
        if (Boolean.TRUE.equals(clearPromotion)) {
            setLabel.accept(null);
            setPromoPrice.accept(null);
            setStartsAt.accept(null);
            setEndsAt.accept(null);
            changes.put("promotion", "cleared");
            return;
        }
        boolean any = label != null || promoPrice != null || startsAt != null || endsAt != null;
        if (!any) return;
        if (promoPrice != null) {
            requireNonNegative(promoPrice);
            setPromoPrice.accept(promoPrice);
        }
        if (label != null) setLabel.accept(label);
        if (startsAt != null) setStartsAt.accept(startsAt);
        if (endsAt != null) setEndsAt.accept(endsAt);
        changes.put("promotionPriceSatang", java.util.Arrays.asList(before, promoPrice));
    }

    private void requireNonNegative(long satang) {
        if (satang < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Price must be >= 0");
        }
    }

    private void requirePositive(int value, String field) {
        if (value <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, field + " must be > 0");
        }
    }
}
