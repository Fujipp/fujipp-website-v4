package fujipp.project.billing.service;

import fujipp.project.billing.dto.AdminUpdateFeatureSubscriptionRequest;
import fujipp.project.billing.dto.AdminUpdateRuntimeSubscriptionRequest;
import fujipp.project.billing.dto.AdminUserSubscriptionsResponse;
import fujipp.project.billing.dto.FeatureSubscriptionResponse;
import fujipp.project.billing.dto.RuntimeSubscriptionResponse;
import fujipp.project.billing.model.FeatureSubscription;
import fujipp.project.billing.model.RuntimeSubscription;
import fujipp.project.billing.repository.FeatureSubscriptionRepository;
import fujipp.project.billing.repository.RuntimeSubscriptionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

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

    private final RuntimeSubscriptionRepository runtimeSubs;
    private final FeatureSubscriptionRepository featureSubs;
    private final AdminAuditService audit;

    @Transactional(readOnly = true)
    public AdminUserSubscriptionsResponse listForUser(UUID userId) {
        List<RuntimeSubscriptionResponse> runtime = runtimeSubs.findByUserId(userId).stream()
            .map(RuntimeSubscriptionResponse::from).toList();
        List<FeatureSubscriptionResponse> features = featureSubs.findByUserId(userId).stream()
            .map(FeatureSubscriptionResponse::from).toList();
        return new AdminUserSubscriptionsResponse(runtime, features);
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
}
