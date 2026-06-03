package fujipp.project.billing.dto;

import fujipp.project.billing.model.WalletTransaction;

import java.time.OffsetDateTime;
import java.util.UUID;

public record WalletTransactionResponse(
    UUID id,
    String direction,
    String type,
    long amountSatang,
    long balanceAfterSatang,
    String referenceType,
    UUID referenceId,
    String note,
    OffsetDateTime createdAt
) {
    public static WalletTransactionResponse from(WalletTransaction tx) {
        return new WalletTransactionResponse(
            tx.getId(),
            tx.getDirection(),
            tx.getType(),
            tx.getAmountSatang(),
            tx.getBalanceAfterSatang(),
            tx.getReferenceType(),
            tx.getReferenceId(),
            tx.getNote(),
            tx.getCreatedAt()
        );
    }
}
