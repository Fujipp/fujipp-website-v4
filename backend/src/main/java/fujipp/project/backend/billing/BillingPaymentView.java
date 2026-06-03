package fujipp.project.backend.billing;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.time.OffsetDateTime;
import java.util.UUID;

/** Subset of billing-service's payment response that the backend needs. */
@JsonIgnoreProperties(ignoreUnknown = true)
public record BillingPaymentView(
    UUID userId,
    String reference,
    String status,
    long amountSatang,
    String currency,
    OffsetDateTime expiresAt
) {}
