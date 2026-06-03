package fujipp.project.billing.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Sent by the main backend after its payment provider confirms a top-up.
 * Confirmation is idempotent in PaymentService.
 */
public record PaymentConfirmRequest(

    @NotBlank
    String reference,

    String providerPaymentId
) {}
