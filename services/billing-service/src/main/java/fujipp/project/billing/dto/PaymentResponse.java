package fujipp.project.billing.dto;

import fujipp.project.billing.model.Payment;

import java.time.OffsetDateTime;
import java.util.UUID;

public record PaymentResponse(
    UUID id,
    String reference,
    String status,
    long amountSatang,
    String currency,
    String qrCodeUrl,
    OffsetDateTime expiresAt,
    OffsetDateTime paidAt
) {
    public static PaymentResponse from(Payment payment) {
        return new PaymentResponse(
            payment.getId(),
            payment.getReference(),
            payment.getStatus(),
            payment.getAmountSatang(),
            payment.getCurrency(),
            payment.getQrCodeUrl(),
            payment.getExpiresAt(),
            payment.getPaidAt()
        );
    }
}
