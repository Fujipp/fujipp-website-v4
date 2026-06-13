package fujipp.project.billing.dto;

import jakarta.validation.constraints.Min;

/**
 * Admin wallet adjustment. {@code direction} is CREDIT (add) or DEBIT (subtract);
 * the amount is always positive. A note explains the reason (kept on the ledger row).
 */
public record AdminWalletAdjustRequest(
    String direction,

    @Min(value = 1, message = "Amount must be positive")
    long amountSatang,

    String note
) {}
