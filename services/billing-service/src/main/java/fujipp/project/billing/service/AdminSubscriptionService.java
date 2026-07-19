package fujipp.project.billing.service;

import fujipp.project.billing.dto.AdminGrantFeatureRequest;
import fujipp.project.billing.dto.AdminGrantRuntimeRequest;
import fujipp.project.billing.dto.AdminUpdateFeatureSubscriptionRequest;
import fujipp.project.billing.dto.AdminUpdateRuntimeSubscriptionRequest;
import fujipp.project.billing.dto.AdminUserSubscriptionsResponse;
import fujipp.project.billing.dto.FeatureSubscriptionResponse;
import fujipp.project.billing.dto.RuntimeSubscriptionResponse;
import fujipp.project.billing.model.FeatureCatalog;
import fujipp.project.billing.model.BotRef;
import fujipp.project.billing.model.FeaturePrice;
import fujipp.project.billing.model.FeatureSubscription;
import fujipp.project.billing.model.RuntimePlan;
import fujipp.project.billing.model.RuntimeSubscription;
import fujipp.project.billing.model.VpsSlot;
import fujipp.project.billing.repository.BotRefRepository;
import fujipp.project.billing.repository.FeatureCatalogRepository;
import fujipp.project.billing.repository.FeaturePriceRepository;
import fujipp.project.billing.repository.FeatureSubscriptionRepository;
import fujipp.project.billing.repository.RuntimePlanRepository;
import fujipp.project.billing.repository.RuntimeSubscriptionRepository;
import fujipp.project.billing.repository.VpsSlotRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Admin override of what a user already owns. Unlike {@link SubscriptionService} (user
 * self-service, ownership-checked), this looks up by id alone and lets an operator adjust
 * the locked-in renewal price, plan, status, period, and auto-renew — each change audited.
 */
@Service
@RequiredArgsConstructor
public class AdminSubscriptionService {

    private static final Set<String> STATUSES = Set.of("ACTIVE", "PAST_DUE", "SUSPENDED", "CANCELED");

    private static final Set<String> BILLING_TYPES = Set.of("RENT_MONTHLY", "RENT_PERMANENT");

    private final RuntimeSubscriptionRepository runtimeSubs;
    private final VpsSlotRepository vpsSlots;
    private final BotRefRepository bots;
    private final FeatureSubscriptionRepository featureSubs;
    private final RuntimePlanRepository runtimePlans;
    private final FeaturePriceRepository featurePrices;
    private final FeatureCatalogRepository features;
    private final AdminAuditService audit;

    @Transactional(readOnly = true)
    public AdminUserSubscriptionsResponse listForUser(UUID userId) {
        List<RuntimeSubscriptionResponse> runtime = runtimeSubs.findByUserId(userId).stream()
            .map(RuntimeSubscriptionResponse::from).toList();
        List<FeatureSubscriptionResponse> features = featureSubs.findByUserId(userId).stream()
            .map(FeatureSubscriptionResponse::from).toList();
        return new AdminUserSubscriptionsResponse(runtime, features);
    }

    // ── grants (create new entitlements, free of charge) ────────────────────────

    /**
     * Grant a fresh runtime seat for free. The optional bot must belong to the target user;
     * an unassigned runtime remains available for the user to attach later.
     */
    @Transactional
    public RuntimeSubscriptionResponse grantRuntime(UUID adminId, AdminGrantRuntimeRequest req) {
        UUID userId = requireUserId(req.userId());
        String subject = blankToNull(req.subjectId());
        if (subject != null) requireOwnedBot(userId, subject);
        RuntimePlan plan = runtimePlans.findById(requireId(req.runtimePlanId(), "runtimePlanId"))
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Runtime plan not found"));
        if (!plan.isActive()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Runtime plan is inactive");
        }
        UUID slotId = req.vpsSlotId() == null ? firstFreeSlotId() : req.vpsSlotId();
        VpsSlot slot = vpsSlots.findByIdForUpdate(slotId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "VPS slot not found"));
        if (!"FREE".equals(slot.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "VPS slot is not available");
        }
        runtimeSubs.findByVpsSlotIdAndStatus(slotId, "ACTIVE").ifPresent(existing -> {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "VPS slot is already occupied");
        });
        if (subject != null) runtimeSubs.findByExternalSubjectIdAndStatus(subject, "ACTIVE").ifPresent(existing -> {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Bot already has an active runtime");
        });

        LocalDate today = LocalDate.now();
        int months = plan.getDurationMonths();
        RuntimeSubscription sub = new RuntimeSubscription();
        sub.setUserId(userId);
        sub.setExternalSubjectId(subject);
        sub.setVpsSlotId(slotId);
        sub.setCurrentPeriodStart(today);
        sub.setCurrentPeriodEnd(today.plusMonths(months));
        sub.setRuntimePlanId(plan.getId());
        sub.setRenewPlanId(plan.getId());
        sub.setRenewPriceSatang(plan.getPriceSatang());
        sub.setStatus("ACTIVE");
        sub.setAutoRenew(true);
        RuntimeSubscription saved = runtimeSubs.saveAndFlush(sub);

        Map<String, Object> details = new LinkedHashMap<>();
        details.put("subjectId", subject);
        details.put("runtimePlanId", plan.getId().toString());
        details.put("vpsSlotId", slotId.toString());
        details.put("months", months);
        audit.record(adminId, "SUBSCRIPTION_GRANT", userId, "RUNTIME_SUBSCRIPTION",
            saved.getId().toString(), details);
        return RuntimeSubscriptionResponse.from(saved);
    }

    /**
     * Grant a feature to a bot for free. Mirrors {@code OrderService.createMonthlyRental} /
     * {@code createPermanentRental}. Rejects (409) if the feature is already live for the
     * subject — adjust the existing subscription instead. Does not require active runtime.
     */
    @Transactional
    public FeatureSubscriptionResponse grantFeature(UUID adminId, AdminGrantFeatureRequest req) {
        UUID userId = requireUserId(req.userId());
        String subject = blankToNull(req.subjectId());
        if (subject != null) requireOwnedBot(userId, subject);
        UUID featureId = requireId(req.featureId(), "featureId");
        String billingType = normalizeBillingType(req.billingType());

        FeatureCatalog feature = features.findById(featureId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Feature not found"));
        if (!feature.isActive()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Feature is inactive");
        }

        if (subject != null) {
            featureSubs.findByFeatureIdAndExternalSubjectId(feature.getId(), subject)
                .filter(s -> isLive(s.getStatus()))
                .ifPresent(s -> { throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Feature already granted for this bot"); });
        }

        FeaturePrice price = req.priceId() == null ? null
            : featurePrices.findById(req.priceId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Price not found"));
        if (price != null && (!price.getFeatureId().equals(featureId)
                || !billingType.equals(price.getKind()) || !price.isActive())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "Price must be an active SKU for the selected feature and billing type");
        }

        LocalDate today = LocalDate.now();
        FeatureSubscription sub = new FeatureSubscription();
        sub.setUserId(userId);
        sub.setFeatureId(feature.getId());
        sub.setPriceId(price == null ? null : price.getId());
        sub.setScope("BOT");
        sub.setExternalSubjectId(subject);
        sub.setBillingType(billingType);
        sub.setStatus("ACTIVE");
        sub.setCurrentPeriodStart(today);
        if ("RENT_MONTHLY".equals(billingType)) {
            int months = price == null || price.getDurationMonths() == null ? 1 : price.getDurationMonths();
            sub.setCurrentPeriodEnd(today.plusMonths(months));
            sub.setAutoRenew(true);
            sub.setRenewPriceSatang(price == null ? null : price.getPriceSatang());
        } else { // RENT_PERMANENT
            sub.setCurrentPeriodEnd(null);
            sub.setAutoRenew(false);
            sub.setRenewPriceSatang(null);
        }
        FeatureSubscription saved = featureSubs.save(sub);

        Map<String, Object> details = new LinkedHashMap<>();
        details.put("subjectId", subject);
        details.put("featureId", feature.getId().toString());
        details.put("billingType", billingType);
        audit.record(adminId, "SUBSCRIPTION_GRANT", userId, "FEATURE_SUBSCRIPTION",
            saved.getId().toString(), details);
        return FeatureSubscriptionResponse.from(saved);
    }

    @Transactional
    public RuntimeSubscriptionResponse updateRuntime(UUID adminId, UUID subId,
                                                     AdminUpdateRuntimeSubscriptionRequest req) {
        RuntimeSubscription sub = runtimeSubs.findById(subId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Subscription not found"));

        Map<String, Object> changes = new LinkedHashMap<>();
        applyRenewPrice(req.clearRenewPrice(), req.renewPriceSatang(),
            sub.getRenewPriceSatang(), sub::setRenewPriceSatang, changes);
        if (req.runtimePlanId() != null && !req.runtimePlanId().equals(sub.getRuntimePlanId())) {
            changes.put("runtimePlanId", java.util.Arrays.asList(idText(sub.getRuntimePlanId()), req.runtimePlanId().toString()));
            sub.setRuntimePlanId(req.runtimePlanId());
        }
        if (req.renewPlanId() != null && !req.renewPlanId().equals(sub.getRenewPlanId())) {
            changes.put("renewPlanId", java.util.Arrays.asList(idText(sub.getRenewPlanId()), req.renewPlanId().toString()));
            sub.setRenewPlanId(req.renewPlanId());
        }
        if (req.status() != null) {
            String status = normalizeStatus(req.status());
            if (!status.equals(sub.getStatus())) {
                changes.put("status", List.of(sub.getStatus(), status));
                sub.setStatus(status);
            }
        }
        if (req.currentPeriodEnd() != null && !req.currentPeriodEnd().equals(sub.getCurrentPeriodEnd())) {
            changes.put("currentPeriodEnd", java.util.Arrays.asList(
                String.valueOf(sub.getCurrentPeriodEnd()), req.currentPeriodEnd().toString()));
            sub.setCurrentPeriodEnd(req.currentPeriodEnd());
        }
        if (req.autoRenew() != null && req.autoRenew() != sub.isAutoRenew()) {
            changes.put("autoRenew", List.of(sub.isAutoRenew(), req.autoRenew()));
            sub.setAutoRenew(req.autoRenew());
        }

        RuntimeSubscription saved = runtimeSubs.save(sub);
        if (!changes.isEmpty()) {
            audit.record(adminId, "SUBSCRIPTION_OVERRIDE", saved.getUserId(),
                "RUNTIME_SUBSCRIPTION", subId.toString(), changes);
        }
        return RuntimeSubscriptionResponse.from(saved);
    }

    @Transactional
    public FeatureSubscriptionResponse updateFeature(UUID adminId, UUID subId,
                                                     AdminUpdateFeatureSubscriptionRequest req) {
        FeatureSubscription sub = featureSubs.findById(subId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Subscription not found"));

        Map<String, Object> changes = new LinkedHashMap<>();
        applyRenewPrice(req.clearRenewPrice(), req.renewPriceSatang(),
            sub.getRenewPriceSatang(), sub::setRenewPriceSatang, changes);
        if (req.status() != null) {
            String status = normalizeStatus(req.status());
            if (!status.equals(sub.getStatus())) {
                changes.put("status", List.of(sub.getStatus(), status));
                sub.setStatus(status);
            }
        }
        if (req.currentPeriodEnd() != null && !req.currentPeriodEnd().equals(sub.getCurrentPeriodEnd())) {
            changes.put("currentPeriodEnd", java.util.Arrays.asList(
                String.valueOf(sub.getCurrentPeriodEnd()), req.currentPeriodEnd().toString()));
            sub.setCurrentPeriodEnd(req.currentPeriodEnd());
        }
        if (req.autoRenew() != null && req.autoRenew() != sub.isAutoRenew()) {
            changes.put("autoRenew", List.of(sub.isAutoRenew(), req.autoRenew()));
            sub.setAutoRenew(req.autoRenew());
        }

        FeatureSubscription saved = featureSubs.save(sub);
        if (!changes.isEmpty()) {
            audit.record(adminId, "SUBSCRIPTION_OVERRIDE", saved.getUserId(),
                "FEATURE_SUBSCRIPTION", subId.toString(), changes);
        }
        return FeatureSubscriptionResponse.from(saved);
    }

    @Transactional
    public FeatureSubscriptionResponse detachFeature(UUID adminId, UUID subId) {
        FeatureSubscription sub = featureSubs.findById(subId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Subscription not found"));
        String previousSubject = sub.getExternalSubjectId();
        sub.setExternalSubjectId(null);
        FeatureSubscription saved = featureSubs.save(sub);

        Map<String, Object> details = new LinkedHashMap<>();
        details.put("previousSubjectId", previousSubject);
        audit.record(adminId, "SUBSCRIPTION_DETACH", saved.getUserId(),
            "FEATURE_SUBSCRIPTION", saved.getId().toString(), details);
        return FeatureSubscriptionResponse.from(saved);
    }

    @Transactional
    public FeatureSubscriptionResponse removeFeature(UUID adminId, UUID subId) {
        FeatureSubscription sub = featureSubs.findById(subId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Subscription not found"));
        String previousSubject = sub.getExternalSubjectId();
        sub.setExternalSubjectId(null);
        sub.setStatus("CANCELED");
        sub.setAutoRenew(false);
        FeatureSubscription saved = featureSubs.save(sub);

        Map<String, Object> details = new LinkedHashMap<>();
        details.put("previousSubjectId", previousSubject);
        details.put("status", "CANCELED");
        audit.record(adminId, "SUBSCRIPTION_REMOVE", saved.getUserId(),
            "FEATURE_SUBSCRIPTION", saved.getId().toString(), details);
        return FeatureSubscriptionResponse.from(saved);
    }

    // ── helpers ─────────────────────────────────────────────────────────────────

    private void applyRenewPrice(Boolean clear, Long renewPriceSatang, Long current,
                                 java.util.function.Consumer<Long> setter, Map<String, Object> changes) {
        if (Boolean.TRUE.equals(clear)) {
            if (current != null) {
                changes.put("renewPriceSatang", java.util.Arrays.asList(current, null));
                setter.accept(null);
            }
            return;
        }
        if (renewPriceSatang != null && !renewPriceSatang.equals(current)) {
            if (renewPriceSatang < 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "renewPriceSatang must be >= 0");
            }
            changes.put("renewPriceSatang", java.util.Arrays.asList(current, renewPriceSatang));
            setter.accept(renewPriceSatang);
        }
    }

    private String normalizeStatus(String status) {
        String upper = status.trim().toUpperCase();
        if (!STATUSES.contains(upper)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "status must be one of " + STATUSES);
        }
        return upper;
    }

    private static String idText(UUID id) {
        return id == null ? null : id.toString();
    }

    private String normalizeBillingType(String billingType) {
        String upper = billingType == null ? "" : billingType.trim().toUpperCase();
        if (!BILLING_TYPES.contains(upper)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "billingType must be one of " + BILLING_TYPES);
        }
        return upper;
    }

    private static boolean isLive(String status) {
        return !"CANCELED".equals(status);
    }

    private static UUID requireUserId(UUID userId) {
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "userId is required");
        }
        return userId;
    }

    private void requireOwnedBot(UUID userId, String botId) {
        UUID id;
        try {
            id = UUID.fromString(botId);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid bot id");
        }
        BotRef bot = bots.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Bot not found"));
        if (!bot.getUserId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Bot not found");
        }
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }

    private static UUID requireId(UUID id, String field) {
        if (id == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, field + " is required");
        }
        return id;
    }

    private UUID firstFreeSlotId() {
        return vpsSlots.findAll().stream()
            .filter(slot -> "FREE".equals(slot.getStatus()))
            .filter(slot -> runtimeSubs.findByVpsSlotIdAndStatus(slot.getId(), "ACTIVE").isEmpty())
            .map(VpsSlot::getId)
            .findFirst()
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT,
                "No free VPS slot is available"));
    }
}
