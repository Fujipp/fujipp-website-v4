package fujipp.project.voucher.dto;

import fujipp.project.voucher.model.Redeem;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;

/**
 * Redeem outcome returned to the caller. Field names match what the legacy NestJS
 * service returned (the redeem job row) so the bot parses it unchanged. {@code amount}
 * is in baht (the DB stores satang).
 */
public record RedeemResponse(
        String id,
        String clientId,
        String phone,
        String status,
        BigDecimal amount,
        String currency,
        String issuer,
        String reference,
        String failCode,
        String failReason,
        String idempotencyKey,
        OffsetDateTime createdAt
) {
    public static RedeemResponse from(Redeem r) {
        BigDecimal amountBaht = r.getAmountSatang() == null
                ? null
                : BigDecimal.valueOf(r.getAmountSatang()).movePointLeft(2).setScale(2, RoundingMode.UNNECESSARY);
        return new RedeemResponse(
                r.getId() == null ? null : r.getId().toString(),
                r.getClientId(),
                r.getPhone(),
                r.getStatus().name(),
                amountBaht,
                r.getCurrency(),
                r.getIssuer(),
                r.getReference(),
                r.getFailCode(),
                r.getFailReason(),
                r.getIdempotencyKey(),
                r.getCreatedAt()
        );
    }
}
