package fujipp.project.billing.dto;

/**
 * The user's permanent bot-slot standing: how many free slots everyone gets, how
 * many extra they've bought, and the price of one more.
 */
public record BotSlotResponse(
    int freeCount,
    int paidSlots,
    long priceSatang
) {}
