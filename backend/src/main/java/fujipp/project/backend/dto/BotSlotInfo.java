package fujipp.project.backend.dto;

/**
 * A user's bot-slot standing for the shop: how many bots they have, their
 * allowance (free + paid), whether they can create another, and the price of one
 * more slot. {@code maxSlots = freeCount + paidSlots}, {@code canCreate = used < maxSlots}.
 */
public record BotSlotInfo(
    long used,
    int freeCount,
    int paidSlots,
    int maxSlots,
    boolean canCreate,
    long priceSatang
) {
    public static BotSlotInfo of(long used, int freeCount, int paidSlots, long priceSatang) {
        int max = freeCount + paidSlots;
        return new BotSlotInfo(used, freeCount, paidSlots, max, used < max, priceSatang);
    }
}
