package fujipp.project.billing.service;

import java.time.OffsetDateTime;

/**
 * Shared promotion logic. A promotion is a fixed price (not a percentage) that
 * applies only while now() is within [starts, ends]. Either bound may be null
 * (open-ended). Reused by catalog reads and by purchase pricing.
 */
final class Pricing {

    private Pricing() {}

    static boolean onPromotion(Long promotionPriceSatang,
                               OffsetDateTime starts, OffsetDateTime ends,
                               OffsetDateTime now) {
        if (promotionPriceSatang == null) return false;
        if (starts != null && now.isBefore(starts)) return false;
        if (ends != null && now.isAfter(ends)) return false;
        return true;
    }

    static long effectiveSatang(long basePriceSatang, Long promotionPriceSatang,
                                OffsetDateTime starts, OffsetDateTime ends,
                                OffsetDateTime now) {
        return onPromotion(promotionPriceSatang, starts, ends, now)
            ? promotionPriceSatang
            : basePriceSatang;
    }
}
