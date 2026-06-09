package fujipp.project.billing.service;

import fujipp.project.billing.dto.FeatureSubscriptionResponse;
import fujipp.project.billing.dto.RuntimeSubscriptionResponse;
import fujipp.project.billing.model.FeatureSubscription;
import fujipp.project.billing.model.RuntimeSubscription;
import fujipp.project.billing.repository.FeaturePriceRepository;
import fujipp.project.billing.repository.FeatureSubscriptionRepository;
import fujipp.project.billing.repository.RuntimePlanRepository;
import fujipp.project.billing.repository.RuntimeSubscriptionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Manage what a user already owns: list subscriptions, toggle auto-renew, and
 * renew manually. The renew*(...) methods are reused by the daily automation job.
 */
@Service
@RequiredArgsConstructor
public class SubscriptionService {

    private final WalletService walletService;
    private final FeatureSubscriptionRepository featureSubscriptionRepository;
    private final RuntimeSubscriptionRepository runtimeSubscriptionRepository;
    private final FeaturePriceRepository priceRepository;
    private final RuntimePlanRepository runtimePlanRepository;

    // ── reads ─────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<FeatureSubscriptionResponse> listFeatureSubscriptions(UUID userId) {
        return featureSubscriptionRepository.findByUserId(userId).stream()
            .map(FeatureSubscriptionResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<RuntimeSubscriptionResponse> listRuntimeSubscriptions(UUID userId) {
        return runtimeSubscriptionRepository.findByUserId(userId).stream()
            .map(RuntimeSubscriptionResponse::from).toList();
    }

    // ── auto-renew toggles ──────────────────────────────────────────────────────

    @Transactional
    public FeatureSubscriptionResponse setFeatureAutoRenew(UUID userId, UUID id, boolean autoRenew) {
        FeatureSubscription sub = ownedFeature(userId, id);
        sub.setAutoRenew(autoRenew);
        return FeatureSubscriptionResponse.from(featureSubscriptionRepository.save(sub));
    }

    @Transactional
    public RuntimeSubscriptionResponse setRuntimeAutoRenew(UUID userId, UUID id, boolean autoRenew) {
        RuntimeSubscription sub = ownedRuntime(userId, id);
        sub.setAutoRenew(autoRenew);
        return RuntimeSubscriptionResponse.from(runtimeSubscriptionRepository.save(sub));
    }

    /** Set a runtime subscription's status (used by the automation sweep). Own transaction. */
    @Transactional
    public void setRuntimeStatus(UUID id, String status) {
        RuntimeSubscription sub = runtimeSubscriptionRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Subscription not found"));
        sub.setStatus(status);
        runtimeSubscriptionRepository.save(sub);
    }

    // ── manual renew (by id, ownership-checked) ─────────────────────────────────

    @Transactional
    public FeatureSubscriptionResponse renewFeatureById(UUID userId, UUID id) {
        return FeatureSubscriptionResponse.from(renewFeature(ownedFeature(userId, id)));
    }

    @Transactional
    public RuntimeSubscriptionResponse renewRuntimeById(UUID userId, UUID id) {
        return RuntimeSubscriptionResponse.from(renewRuntime(ownedRuntime(userId, id)));
    }

    // ── shared renew core (also called by automation) ───────────────────────────

    /** Charges the locked-in renew price and extends the period by the SKU's term. */
    @Transactional
    public FeatureSubscription renewFeature(FeatureSubscription sub) {
        if (!"RENT_MONTHLY".equals(sub.getBillingType())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "Permanent rentals do not renew");
        }
        long price = requireRenewPrice(sub.getRenewPriceSatang());
        int months = featureTermMonths(sub);

        walletService.debit(sub.getUserId(), price, "RENEWAL", "SUBSCRIPTION", sub.getId(),
            "Feature renewal");

        sub.setCurrentPeriodEnd(extendFrom(sub.getCurrentPeriodEnd(), months));
        sub.setStatus("ACTIVE");
        return featureSubscriptionRepository.save(sub);
    }

    @Transactional
    public RuntimeSubscription renewRuntime(RuntimeSubscription sub) {
        long price = requireRenewPrice(sub.getRenewPriceSatang());
        int months = runtimeTermMonths(sub);

        walletService.debit(sub.getUserId(), price, "RENEWAL", "SUBSCRIPTION", sub.getId(),
            "Runtime renewal");

        sub.setCurrentPeriodEnd(extendFrom(sub.getCurrentPeriodEnd(), months));
        sub.setStatus("ACTIVE");
        return runtimeSubscriptionRepository.save(sub);
    }

    // ── helpers ─────────────────────────────────────────────────────────────────

    private FeatureSubscription ownedFeature(UUID userId, UUID id) {
        FeatureSubscription sub = featureSubscriptionRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Subscription not found"));
        if (!sub.getUserId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Subscription not found");
        }
        return sub;
    }

    private RuntimeSubscription ownedRuntime(UUID userId, UUID id) {
        RuntimeSubscription sub = runtimeSubscriptionRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Subscription not found"));
        if (!sub.getUserId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Subscription not found");
        }
        return sub;
    }

    private int featureTermMonths(FeatureSubscription sub) {
        if (sub.getPriceId() == null) return 1;
        return priceRepository.findById(sub.getPriceId())
            .map(p -> p.getDurationMonths() == null ? 1 : p.getDurationMonths())
            .orElse(1);
    }

    private int runtimeTermMonths(RuntimeSubscription sub) {
        if (sub.getRenewPlanId() == null) return 1;
        return runtimePlanRepository.findById(sub.getRenewPlanId())
            .map(p -> p.getDurationMonths())
            .orElse(1);
    }

    private static long requireRenewPrice(Long renewPriceSatang) {
        if (renewPriceSatang == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No renew price set");
        }
        return renewPriceSatang;
    }

    /** Stack from the later of today / current end so renewing early never loses days. */
    private static LocalDate extendFrom(LocalDate currentEnd, int months) {
        LocalDate today = LocalDate.now();
        LocalDate base = (currentEnd != null && currentEnd.isAfter(today)) ? currentEnd : today;
        return base.plusMonths(months);
    }
}
