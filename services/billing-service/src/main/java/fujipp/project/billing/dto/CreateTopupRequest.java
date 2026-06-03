package fujipp.project.billing.dto;

import jakarta.validation.constraints.Min;

/**
 * Minimum top-up is 50 THB = 5000 satang (also enforced by a DB CHECK).
 */
public record CreateTopupRequest(

    @Min(value = 5000, message = "Minimum top-up is 5000 satang (50 THB)")
    long amountSatang
) {}
