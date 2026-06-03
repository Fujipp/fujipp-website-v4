package fujipp.project.billing.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Sent by the main backend after its payment provider confirms a top-up.
 * Confirmation is idempotent in PaymentService.
 */
public record PaymentConfirmRequest(

    @NotBlank
    String reference,

    /** SlipOK transRef — stored as provider_payment_id (unique) to block slip reuse. */
    String providerPaymentId,

    /** Verified amount (satang). If present, must equal the pending payment amount. */
    Long paidAmountSatang
) {}
