package fujipp.project.billing.service;

import fujipp.project.billing.dto.BotSlotResponse;
import fujipp.project.billing.model.CreditOrder;
import fujipp.project.billing.model.CreditOrderItem;
import fujipp.project.billing.model.UserBotSlot;
import fujipp.project.billing.repository.AutomationSettingRepository;
import fujipp.project.billing.repository.CreditOrderItemRepository;
import fujipp.project.billing.repository.CreditOrderRepository;
import fujipp.project.billing.repository.UserBotSlotRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Sells permanent Bot Slots — the "right to own one more bot" (separate from
 * runtime). The free allowance ({@code bot_slot.free_count}) and price
 * ({@code bot_slot.price_satang}) are read from settings.
 *
 * A purchase runs in ONE transaction: create order → debit wallet once → grant the
 * slot (bots.user_bot_slots) → record the order item. If the charge fails (e.g.
 * insufficient credit) everything rolls back, so a slot is never granted unpaid.
 * Idempotent on the order's {@code idempotencyKey}: a retried submit returns the
 * current standing instead of charging — and granting — twice.
 */
@Service
@RequiredArgsConstructor
public class BotSlotService {

    private static final String FREE_COUNT_KEY   = "bot_slot.free_count";
    private static final String PRICE_KEY        = "bot_slot.price_satang";
    private static final int    DEFAULT_FREE     = 3;
    private static final long   DEFAULT_PRICE    = 5000L; // 50 THB

    private final WalletService walletService;
    private final UserBotSlotRepository userBotSlots;
    private final CreditOrderRepository orderRepository;
    private final CreditOrderItemRepository orderItemRepository;
    private final AutomationSettingRepository settings;

    @Transactional(readOnly = true)
    public BotSlotResponse view(UUID userId) {
        int paid = userBotSlots.findByUserId(userId).map(UserBotSlot::getPaidSlots).orElse(0);
        return new BotSlotResponse(freeCount(), paid, price());
    }

    @Transactional
    public BotSlotResponse purchase(UUID userId, String idempotencyKey) {
        boolean hasKey = idempotencyKey != null && !idempotencyKey.isBlank();
        if (hasKey && orderRepository.findByIdempotencyKey(idempotencyKey).isPresent()) {
            return view(userId); // already charged + granted on the first submit
        }

        long price = price();

        CreditOrder order = new CreditOrder();
        order.setUserId(userId);
        order.setStatus("PENDING");
        order.setTotalSatang(price);
        order.setCurrency("THB");
        order.setIdempotencyKey(hasKey ? idempotencyKey : null);
        order = orderRepository.saveAndFlush(order);

        // Charge once. Locks the user's wallet, so concurrent same-user purchases
        // serialize here — making the grant below race-free without its own lock.
        walletService.debit(userId, price, "PURCHASE", "ORDER", order.getId(), "Bot slot (permanent)");

        UserBotSlot slot = userBotSlots.findByUserIdForUpdate(userId).orElseGet(() -> {
            UserBotSlot fresh = new UserBotSlot();
            fresh.setUserId(userId);
            fresh.setPaidSlots(0);
            return fresh;
        });
        slot.setPaidSlots(slot.getPaidSlots() + 1);
        userBotSlots.saveAndFlush(slot);

        CreditOrderItem item = new CreditOrderItem();
        item.setOrderId(order.getId());
        item.setKind("BOT_SLOT");
        item.setAmountSatang(price);
        item.setItemCode("bot-slot");
        item.setItemName("Bot Slot (ถาวร)");
        orderItemRepository.save(item);

        order.setStatus("PAID");
        orderRepository.save(order);

        return new BotSlotResponse(freeCount(), slot.getPaidSlots(), price);
    }

    // ── settings ───────────────────────────────────────────────────────────────

    private int freeCount() {
        return (int) settingLong(FREE_COUNT_KEY, DEFAULT_FREE);
    }

    private long price() {
        return settingLong(PRICE_KEY, DEFAULT_PRICE);
    }

    private long settingLong(String key, long fallback) {
        return settings.findById(key)
            .map(s -> {
                try {
                    return Long.parseLong(s.getSettingValue().trim());
                } catch (NumberFormatException e) {
                    return fallback;
                }
            })
            .orElse(fallback);
    }
}
