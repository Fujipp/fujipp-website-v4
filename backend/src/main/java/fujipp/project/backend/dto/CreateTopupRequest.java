package fujipp.project.backend.dto;

import jakarta.validation.constraints.Min;

public record CreateTopupRequest(

    @Min(value = 5000, message = "Minimum top-up is 5000 satang (50 THB)")
    long amountSatang
) {}
