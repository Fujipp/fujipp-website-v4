package fujipp.project.billing.service;

import fujipp.project.billing.dto.OrderResponse;
import fujipp.project.billing.dto.PurchaseItemRequest;
import fujipp.project.billing.dto.PurchaseRequest;
import fujipp.project.billing.model.CreditOrder;
import fujipp.project.billing.model.CreditOrderItem;
import fujipp.project.billing.model.FeatureCatalog;
import fujipp.project.billing.model.FeaturePrice;
import fujipp.project.billing.model.FeatureSubscription;
import fujipp.project.billing.model.RuntimePlan;
import fujipp.project.billing.model.RuntimeSubscription;
import fujipp.project.billing.model.SourceCodeEntitlement;
import fujipp.project.billing.repository.CreditOrderItemRepository;
import fujipp.project.billing.repository.CreditOrderRepository;
import fujipp.project.billing.repository.FeatureCatalogRepository;
import fujipp.project.billing.repository.FeaturePriceRepository;
import fujipp.project.billing.repository.FeatureSubscriptionRepository;
import fujipp.project.billing.repository.RuntimePlanRepository;
import fujipp.project.billing.repository.RuntimeSubscriptionRepository;
import fujipp.project.billing.repository.SourceCodeEntitlementRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Buys features / source code / runtime with wallet credit.
 *
 * The whole purchase runs in one transaction: validate → debit once → create
 * order, items and entitlements. If anything fails (e.g. insufficient credit),
 * everything rolls back, so credit is never taken without delivery.
 *
 * Idempotent on {@code idempotencyKey}: a retried submit returns the original
 * order rather than charging again.
 */
@Service
@RequiredArgsConstructor
public class OrderService {

    private final WalletService walletService;
    private final FeaturePriceRepository priceRepository;
    private final FeatureCatalogRepository featureRepository;
    private final RuntimePlanRepository runtimePlanRepository;
    private final CreditOrderRepository orderRepository;
    private final CreditOrderItemRepository orderItemRepository;
    private final FeatureSubscriptionRepository featureSubscriptionRepository;
    private final RuntimeSubscriptionRepository runtimeSubscriptionRepository;
    private final SourceCodeEntitlementRepository sourceCodeEntitlementRepository;

    @Transactional
    public OrderResponse purchase(UUID userId, PurchaseRequest request) {
        // Idempotent replay
        if (request.idempotencyKey() != null && !request.idempotencyKey().isBlank()) {
            var existing = orderRepository.findByIdempotencyKey(request.idempotencyKey());
            if (existing.isPresent()) {
                CreditOrder order = existing.get();
                return OrderResponse.from(order, orderItemRepository.findByOrderId(order.getId()));
            }
        }

        OffsetDateTime now = OffsetDateTime.now();
        List<ResolvedLine> lines = resolveAndValidate(userId, request.items(), now);

        long total = lines.stream().mapToLong(ResolvedLine::amountSatang).sum();

        // Create the order first so the ledger debit can reference it
        CreditOrder order = new CreditOrder();
        order.setUserId(userId);
        order.setStatus("PENDING");
        order.setTotalSatang(total);
        order.setCurrency("THB");
        order.setIdempotencyKey(
            request.idempotencyKey() == null || request.idempotencyKey().isBlank()
                ? null : request.idempotencyKey());
        order = orderRepository.saveAndFlush(order);

        // Charge once (throws 402 and rolls everything back if credit is short)
        walletService.debit(userId, total, "PURCHASE", "ORDER", order.getId(), "Purchase");

        for (ResolvedLine line : lines) {
            persistItem(order.getId(), line);
            applyEntitlement(userId, line);
        }

        order.setStatus("PAID");
        order = orderRepository.save(order);
        return OrderResponse.from(order, orderItemRepository.findByOrderId(order.getId()));
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> listOrders(UUID userId) {
        return orderRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
            .map(o -> OrderResponse.from(o, orderItemRepository.findByOrderId(o.getId())))
            .toList();
    }

    // ── validation / pricing ──────────────────────────────────────────────────

    private List<ResolvedLine> resolveAndValidate(UUID userId, List<PurchaseItemRequest> items,
                                                  OffsetDateTime now) {
        List<ResolvedLine> lines = new ArrayList<>();
        Set<String> runtimeSubjectsInRequest = new HashSet<>();

        // First pass: resolve prices and which subjects get runtime in this basket
        for (PurchaseItemRequest item : items) {
            boolean hasPrice = item.priceId() != null;
            boolean hasRuntime = item.runtimePlanId() != null;
            if (hasPrice == hasRuntime) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Each item must have exactly one of priceId or runtimePlanId");
            }

            if (hasRuntime) {
                RuntimePlan plan = runtimePlanRepository.findById(item.runtimePlanId())
                    .filter(RuntimePlan::isActive)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Runtime plan not found"));
                String subject = requireSubject(item.externalSubjectId(), "RUNTIME");
                long amount = Pricing.effectiveSatang(plan.getPriceSatang(), plan.getPromotionPriceSatang(),
                    plan.getPromotionStartsAt(), plan.getPromotionEndsAt(), now);
                runtimeSubjectsInRequest.add(subject);
                lines.add(new ResolvedLine("RUNTIME", null, plan.getId(), null, subject,
                    amount, plan.getCode(), plan.getName(), plan.getDurationMonths(), null));
            } else {
                FeaturePrice price = priceRepository.findById(item.priceId())
                    .filter(FeaturePrice::isActive)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Price not found"));
                FeatureCatalog feature = featureRepository.findById(price.getFeatureId())
                    .filter(FeatureCatalog::isActive)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Feature not found"));
                long amount = Pricing.effectiveSatang(price.getPriceSatang(), price.getPromotionPriceSatang(),
                    price.getPromotionStartsAt(), price.getPromotionEndsAt(), now);

                String subject;
                switch (price.getKind()) {
                    // Features are per-bot: both the (legacy) monthly rental and the
                    // permanent purchase are tied to one subject (bot).
                    case "RENT_MONTHLY", "RENT_PERMANENT" ->
                        subject = requireSubject(item.externalSubjectId(), price.getKind());
                    case "SOURCE_CODE" -> subject = null; // user-owned, not tied to a bot
                    default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Unsupported price kind: " + price.getKind());
                }
                lines.add(new ResolvedLine(price.getKind(), feature.getId(), null, price.getId(), subject,
                    amount, feature.getCode(), feature.getName(),
                    price.getDurationMonths(), feature.getCurrentSourceVersion()));
            }
        }

        // Second pass: gating + duplicate checks (before any charge)
        for (ResolvedLine line : lines) {
            switch (line.kind()) {
                case "RENT_MONTHLY" -> {
                    requireRuntimeActive(line.subject(), runtimeSubjectsInRequest);
                    featureSubscriptionRepository
                        .findByFeatureIdAndExternalSubjectId(line.featureId(), line.subject())
                        .filter(s -> isLive(s.getStatus()))
                        .ifPresent(s -> { throw conflict("Feature already rented for this subject"); });
                }
                case "RENT_PERMANENT" -> featureSubscriptionRepository
                    .findByFeatureIdAndExternalSubjectId(line.featureId(), line.subject())
                    .filter(s -> isLive(s.getStatus()))
                    .ifPresent(s -> { throw conflict("Feature already owned for this bot"); });
                case "SOURCE_CODE" -> sourceCodeEntitlementRepository
                    .findByUserIdAndFeatureId(userId, line.featureId())
                    .ifPresent(s -> { throw conflict("Source code already owned"); });
                default -> { /* RUNTIME stacks freely */ }
            }
        }
        return lines;
    }

    private void requireRuntimeActive(String subject, Set<String> runtimeSubjectsInRequest) {
        if (runtimeSubjectsInRequest.contains(subject)) return; // bought in same basket
        boolean active = runtimeSubscriptionRepository.findByExternalSubjectId(subject)
            .map(r -> "ACTIVE".equals(r.getStatus()))
            .orElse(false);
        if (!active) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "Runtime must be active for this bot before renting features");
        }
    }

    // ── persistence ─────────────────────────────────────────────────────────

    private void persistItem(UUID orderId, ResolvedLine line) {
        CreditOrderItem item = new CreditOrderItem();
        item.setOrderId(orderId);
        item.setKind(line.kind());
        item.setFeatureId(line.featureId());
        item.setRuntimePlanId(line.runtimePlanId());
        item.setPriceId(line.priceId());
        item.setExternalSubjectId(line.subject());
        item.setAmountSatang(line.amountSatang());
        item.setItemCode(line.code());
        item.setItemName(line.name());
        orderItemRepository.save(item);
    }

    private void applyEntitlement(UUID userId, ResolvedLine line) {
        switch (line.kind()) {
            case "RUNTIME"        -> stackRuntime(userId, line);
            case "RENT_MONTHLY"   -> createMonthlyRental(userId, line);
            case "RENT_PERMANENT" -> createPermanentRental(userId, line);
            case "SOURCE_CODE"    -> createSourceEntitlement(userId, line);
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown kind");
        }
    }

    private void stackRuntime(UUID userId, ResolvedLine line) {
        LocalDate today = LocalDate.now();
        int months = line.durationMonths() == null ? 1 : line.durationMonths();
        RuntimeSubscription sub = runtimeSubscriptionRepository
            .findByExternalSubjectId(line.subject())
            .orElseGet(RuntimeSubscription::new);

        if (sub.getId() == null) {
            sub.setUserId(userId);
            sub.setExternalSubjectId(line.subject());
            sub.setCurrentPeriodStart(today);
            sub.setCurrentPeriodEnd(today.plusMonths(months));
        } else {
            LocalDate base = sub.getCurrentPeriodEnd() != null && sub.getCurrentPeriodEnd().isAfter(today)
                ? sub.getCurrentPeriodEnd() : today;
            sub.setCurrentPeriodEnd(base.plusMonths(months));
        }
        sub.setRuntimePlanId(line.runtimePlanId());
        sub.setRenewPlanId(line.runtimePlanId());
        sub.setRenewPriceSatang(line.amountSatang());
        sub.setStatus("ACTIVE");
        sub.setAutoRenew(true);
        runtimeSubscriptionRepository.saveAndFlush(sub);
    }

    private void createMonthlyRental(UUID userId, ResolvedLine line) {
        LocalDate today = LocalDate.now();
        int months = line.durationMonths() == null ? 1 : line.durationMonths();
        FeatureSubscription sub = new FeatureSubscription();
        sub.setUserId(userId);
        sub.setFeatureId(line.featureId());
        sub.setPriceId(line.priceId());
        sub.setScope("BOT");
        sub.setExternalSubjectId(line.subject());
        sub.setBillingType("RENT_MONTHLY");
        sub.setStatus("ACTIVE");
        sub.setCurrentPeriodStart(today);
        sub.setCurrentPeriodEnd(today.plusMonths(months));
        sub.setAutoRenew(true);
        sub.setRenewPriceSatang(line.amountSatang());
        featureSubscriptionRepository.save(sub);
    }

    /** Permanent ownership of a feature for ONE bot (scope=BOT, never expires). */
    private void createPermanentRental(UUID userId, ResolvedLine line) {
        FeatureSubscription sub = new FeatureSubscription();
        sub.setUserId(userId);
        sub.setFeatureId(line.featureId());
        sub.setPriceId(line.priceId());
        sub.setScope("BOT");
        sub.setExternalSubjectId(line.subject());
        sub.setBillingType("RENT_PERMANENT");
        sub.setStatus("ACTIVE");
        sub.setCurrentPeriodStart(LocalDate.now());
        sub.setCurrentPeriodEnd(null);
        sub.setAutoRenew(false);
        sub.setRenewPriceSatang(null);
        featureSubscriptionRepository.save(sub);
    }

    private void createSourceEntitlement(UUID userId, ResolvedLine line) {
        SourceCodeEntitlement ent = new SourceCodeEntitlement();
        ent.setUserId(userId);
        ent.setFeatureId(line.featureId());
        ent.setPriceId(line.priceId());
        ent.setPurchasedVersion(line.sourceVersion());
        ent.setLicenseKey("LIC-" + UUID.randomUUID().toString().toUpperCase());
        // READY = entitled; a download link is minted on request against the latest release.
        ent.setStatus("READY");
        ent.setDownloadCount(0);
        sourceCodeEntitlementRepository.save(ent);
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private static String requireSubject(String subject, String kind) {
        if (subject == null || subject.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                kind + " requires externalSubjectId (the bot id)");
        }
        return subject;
    }

    private static boolean isLive(String status) {
        return "ACTIVE".equals(status) || "PAST_DUE".equals(status);
    }

    private static ResponseStatusException conflict(String message) {
        return new ResponseStatusException(HttpStatus.CONFLICT, message);
    }

    /** Internal resolved basket line (post-pricing). */
    private record ResolvedLine(
        String kind,
        UUID featureId,
        UUID runtimePlanId,
        UUID priceId,
        String subject,
        long amountSatang,
        String code,
        String name,
        Integer durationMonths,
        String sourceVersion
    ) {}
}
