package fujipp.project.billing.dto;

import java.time.Instant;
import java.util.UUID;

public record BotAccessRuleResponse(
        UUID id,
        UUID botId,
        String featureCode,
        String targetType,
        String targetDiscordId,
        String effect,
        boolean enabled,
        Instant createdAt,
        Instant updatedAt) {
}
