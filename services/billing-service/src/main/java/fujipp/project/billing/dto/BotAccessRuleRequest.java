package fujipp.project.billing.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record BotAccessRuleRequest(
        @NotBlank
        @Pattern(regexp = "\\*|[a-z0-9]+(?:-[a-z0-9]+)*")
        String featureCode,
        @NotBlank
        @Pattern(regexp = "ROLE|USER")
        String targetType,
        @NotBlank
        @Pattern(regexp = "[0-9]{15,22}")
        String targetDiscordId,
        @NotBlank
        @Pattern(regexp = "ALLOW|DENY")
        String effect,
        Boolean enabled) {
}
