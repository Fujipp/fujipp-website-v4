package fujipp.project.billing.service;

import fujipp.project.billing.dto.AdminSeatView;
import fujipp.project.billing.dto.AdminUnseatedRuntime;
import fujipp.project.billing.dto.RuntimeSubscriptionResponse;
import fujipp.project.billing.dto.VpsNodeView;
import fujipp.project.billing.dto.VpsSlotView;
import fujipp.project.billing.model.BotRef;
import fujipp.project.billing.model.CreditOrder;
import fujipp.project.billing.model.CreditOrderItem;
import fujipp.project.billing.model.RuntimePlan;
import fujipp.project.billing.model.RuntimeSubscription;
import fujipp.project.billing.model.VpsNode;
import fujipp.project.billing.model.VpsSlot;
import fujipp.project.billing.repository.BotRefRepository;
import fujipp.project.billing.repository.CreditOrderItemRepository;
import fujipp.project.billing.repository.CreditOrderRepository;
import fujipp.project.billing.repository.RuntimePlanRepository;
import fujipp.project.billing.repository.RuntimeSubscriptionRepository;
import fujipp.project.billing.repository.VpsNodeRepository;
import fujipp.project.billing.repository.VpsSlotRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * The "server cabinet": sells runtime per VPS seat and moves it between bots.
 *
 *   • A seat is sellable when its admin status is FREE and no active runtime sits
 *     on it. Buying locks the seat row, so two buyers can't take the same one.
 *   • A runtime is bought unassigned, then may be assigned to a bot later.
 *   • Assigning/moving a runtime only changes which bot it powers; the seat stays.
 *     Moving to another bot leaves the old bot with no runtime → offline.
 *
 * The DB enforces one active runtime per seat and one per bot (partial uniques);
 * the checks here just turn those into friendly 409s before charging.
 */
@Service
@RequiredArgsConstructor
public class RuntimeSlotService {

    private static final String ACTIVE = "ACTIVE";

    private final WalletService walletService;
    private final VpsNodeRepository vpsNodes;
    private final VpsSlotRepository vpsSlots;
    private final RuntimePlanRepository runtimePlans;
    private final RuntimeSubscriptionRepository runtimeSubs;
    private final CreditOrderRepository orderRepository;
    private final CreditOrderItemRepository orderItemRepository;
    private final BotRefRepository bots;

    // ── cabinet view ────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<VpsNodeView> listVps(UUID userId) {
        // slotId → active runtime occupying it
        Map<UUID, RuntimeSubscription> bySlot = runtimeSubs.findByStatusAndVpsSlotIdIsNotNull(ACTIVE).stream()
            .collect(Collectors.toMap(RuntimeSubscription::getVpsSlotId, Function.identity(), (a, b) -> a));

        List<VpsNodeView> out = new ArrayList<>();
        for (VpsNode node : vpsNodes.findAllByOrderByNameAsc()) {
            if ("OFFLINE".equals(node.getStatus())) continue;

            List<VpsSlotView> slots = new ArrayList<>();
            int free = 0;
            for (VpsSlot slot : vpsSlots.findByNodeIdOrderBySlotIndexAsc(node.getId())) {
                RuntimeSubscription rt = bySlot.get(slot.getId());
                String occupancy;
                if (rt != null) {
                    occupancy = "OCCUPIED";
                } else if ("RESERVED".equals(slot.getStatus()) || "MAINTENANCE".equals(slot.getStatus())) {
                    occupancy = slot.getStatus();
                } else {
                    occupancy = "FREE";
                    free++;
                }
                slots.add(new VpsSlotView(
                    slot.getId(),
                    slot.getSlotIndex(),
                    occupancy,
                    rt != null && rt.getUserId().equals(userId),
                    rt == null ? null : rt.getId(),
                    rt == null ? null : rt.getExternalSubjectId(),
                    rt == null ? null : rt.getCurrentPeriodEnd()));
            }
            out.add(new VpsNodeView(node.getId(), node.getName(), node.getLabel(), node.getRegion(),
                node.getStatus(), node.getMaxSlots(), free, slots));
        }
        return out;
    }

    /** Seat ids currently held by an active runtime — the admin uses this to avoid
     *  shrinking/reserving/maintenancing a seat that's in use. */
    @Transactional(readOnly = true)
    public List<UUID> occupiedSlotIds() {
        return runtimeSubs.findByStatusAndVpsSlotIdIsNotNull(ACTIVE).stream()
            .map(RuntimeSubscription::getVpsSlotId)
            .toList();
    }

    /** Active runtimes that hold no seat (legacy/orphan) — the admin can re-seat them. */
    @Transactional(readOnly = true)
    public List<AdminUnseatedRuntime> unseatedRuntimes() {
        return runtimeSubs.findByStatusAndVpsSlotIdIsNull(ACTIVE).stream()
            .map(r -> new AdminUnseatedRuntime(r.getId(), r.getExternalSubjectId(),
                r.getUserId(), r.getCurrentPeriodEnd()))
            .toList();
    }

    /** Every seat across the fleet with its occupant (owner/bot/runtime/expiry) for the admin table. */
    @Transactional(readOnly = true)
    public List<AdminSeatView> adminSeats() {
        Map<UUID, RuntimeSubscription> bySlot = runtimeSubs.findByStatusAndVpsSlotIdIsNotNull(ACTIVE).stream()
            .collect(Collectors.toMap(RuntimeSubscription::getVpsSlotId, Function.identity(), (a, b) -> a));

        List<AdminSeatView> out = new ArrayList<>();
        for (VpsNode node : vpsNodes.findAllByOrderByNameAsc()) {
            for (VpsSlot slot : vpsSlots.findByNodeIdOrderBySlotIndexAsc(node.getId())) {
                RuntimeSubscription rt = bySlot.get(slot.getId());
                String occupancy = rt != null ? "OCCUPIED"
                    : ("RESERVED".equals(slot.getStatus()) || "MAINTENANCE".equals(slot.getStatus())
                        ? slot.getStatus() : "FREE");
                out.add(new AdminSeatView(
                    node.getId(), node.getName(), node.getStatus(),
                    slot.getId(), slot.getSlotIndex(), occupancy,
                    rt == null ? null : rt.getId(),
                    rt == null ? null : rt.getUserId(),
                    rt == null ? null : rt.getExternalSubjectId(),
                    rt == null ? null : rt.getCurrentPeriodEnd()));
            }
        }
        return out;
    }

    /** Admin: move a runtime to a different free seat (keeps its bot assignment). */
    @Transactional
    public RuntimeSubscriptionResponse adminMoveSeat(UUID runtimeId, UUID targetSlotId) {
        RuntimeSubscription sub = runtimeSubs.findById(runtimeId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Runtime not found"));
        if (targetSlotId.equals(sub.getVpsSlotId())) {
            return RuntimeSubscriptionResponse.from(sub); // already there
        }
        VpsSlot target = vpsSlots.findByIdForUpdate(targetSlotId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Target seat not found"));
        if (!"FREE".equals(target.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Target seat is not available");
        }
        if (runtimeSubs.findByVpsSlotIdAndStatus(targetSlotId, ACTIVE).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Target seat is already taken");
        }
        sub.setVpsSlotId(targetSlotId);
        return RuntimeSubscriptionResponse.from(runtimeSubs.save(sub));
    }

    // ── buy a seat ────────────────────────────────────────────────────────────

    @Transactional
    public RuntimeSubscriptionResponse purchaseForSlot(UUID userId, UUID slotId, UUID runtimePlanId,
                                                       String idempotencyKey) {
        boolean hasKey = idempotencyKey != null && !idempotencyKey.isBlank();
        if (hasKey && orderRepository.findByIdempotencyKey(idempotencyKey).isPresent()) {
            return runtimeSubs.findByVpsSlotIdAndStatus(slotId, ACTIVE)
                .map(RuntimeSubscriptionResponse::from)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT,
                    "Duplicate request but the seat is no longer active"));
        }

        VpsSlot slot = vpsSlots.findByIdForUpdate(slotId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Seat not found"));
        if (!"FREE".equals(slot.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Seat is not available");
        }
        VpsNode node = vpsNodes.findById(slot.getNodeId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Host not found"));
        if (!"ACTIVE".equals(node.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This host is not accepting new runtime");
        }
        if (runtimeSubs.findByVpsSlotIdAndStatus(slotId, ACTIVE).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Seat is already taken");
        }

        RuntimePlan plan = runtimePlans.findById(runtimePlanId)
            .filter(RuntimePlan::isActive)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Runtime plan not found"));

        long price = Pricing.effectiveSatang(plan.getPriceSatang(), plan.getPromotionPriceSatang(),
            plan.getPromotionStartsAt(), plan.getPromotionEndsAt(), OffsetDateTime.now());

        CreditOrder order = new CreditOrder();
        order.setUserId(userId);
        order.setStatus("PENDING");
        order.setTotalSatang(price);
        order.setCurrency("THB");
        order.setIdempotencyKey(hasKey ? idempotencyKey : null);
        order = orderRepository.saveAndFlush(order);

        walletService.debit(userId, price, "PURCHASE", "ORDER", order.getId(), "Runtime hosting");

        LocalDate today = LocalDate.now();
        RuntimeSubscription sub = new RuntimeSubscription();
        sub.setUserId(userId);
        sub.setExternalSubjectId(null);
        sub.setVpsSlotId(slotId);
        sub.setRuntimePlanId(plan.getId());
        sub.setStatus(ACTIVE);
        sub.setCurrentPeriodStart(today);
        sub.setCurrentPeriodEnd(today.plusMonths(plan.getDurationMonths()));
        sub.setAutoRenew(true);
        sub.setRenewPlanId(plan.getId());
        sub.setRenewPriceSatang(price);
        sub = runtimeSubs.saveAndFlush(sub);

        CreditOrderItem item = new CreditOrderItem();
        item.setOrderId(order.getId());
        item.setKind("RUNTIME");
        item.setRuntimePlanId(plan.getId());
        item.setExternalSubjectId(null);
        item.setAmountSatang(price);
        item.setItemCode(plan.getCode());
        item.setItemName(plan.getName());
        orderItemRepository.save(item);

        order.setStatus("PAID");
        orderRepository.save(order);

        return RuntimeSubscriptionResponse.from(sub);
    }

    // ── assign / move / unassign ────────────────────────────────────────────────

    @Transactional
    public RuntimeSubscriptionResponse assign(UUID userId, UUID runtimeId, String externalSubjectId) {
        RuntimeSubscription sub = ownedRuntime(userId, runtimeId);
        requireHeldRuntime(sub);

        String botId = blankToNull(externalSubjectId);
        if (botId == null) {
            sub.setExternalSubjectId(null); // unassign — keeps the seat, powers no bot
            return RuntimeSubscriptionResponse.from(runtimeSubs.save(sub));
        }

        if (botId.equals(sub.getExternalSubjectId())) {
            return RuntimeSubscriptionResponse.from(sub); // already assigned here
        }

        requireOwnedBot(userId, botId);
        runtimeSubs.findByExternalSubjectIdAndStatus(botId, ACTIVE)
            .filter(other -> !other.getId().equals(runtimeId))
            .ifPresent(other -> {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "This bot already has an active runtime");
            });

        // Moving the link is all it takes: the previous bot (if any) is left with no
        // active runtime → offline; this bot now has one → online.
        sub.setExternalSubjectId(botId);
        return RuntimeSubscriptionResponse.from(runtimeSubs.save(sub));
    }

    // ── helpers ─────────────────────────────────────────────────────────────────

    private RuntimeSubscription ownedRuntime(UUID userId, UUID runtimeId) {
        RuntimeSubscription sub = runtimeSubs.findById(runtimeId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Runtime not found"));
        if (!sub.getUserId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Runtime not found");
        }
        return sub;
    }

    private static void requireHeldRuntime(RuntimeSubscription sub) {
        if ((!ACTIVE.equals(sub.getStatus()) && !"PAST_DUE".equals(sub.getStatus())) || sub.getVpsSlotId() == null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "Runtime is no longer held; buy an available runtime slot instead");
        }
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

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s;
    }
}
