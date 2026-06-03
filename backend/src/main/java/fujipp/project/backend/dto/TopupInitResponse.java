package fujipp.project.backend.dto;

/**
 * Returned after opening a top-up: the reference to verify against and the
 * PromptPay payload the frontend renders as a QR for the customer to pay.
 */
public record TopupInitResponse(
    String reference,
    long amountSatang,
    String promptPayPayload
) {}
