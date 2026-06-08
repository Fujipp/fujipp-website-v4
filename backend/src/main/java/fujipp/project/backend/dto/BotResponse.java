package fujipp.project.backend.dto;

import fujipp.project.backend.model.BotInstance;

import java.time.OffsetDateTime;
import java.util.UUID;

/** Safe view of a bot — never exposes the encrypted token. */
public record BotResponse(
    UUID id,
    String name,
    String status,
    String discordApplicationId,
    String discordGuildId,
    boolean tokenConfigured,
    OffsetDateTime createdAt
) {
    public static BotResponse from(BotInstance bot) {
        return new BotResponse(
            bot.getId(),
            bot.getName(),
            bot.getStatus(),
            bot.getDiscordApplicationId(),
            bot.getDiscordGuildId(),
            bot.getDiscordTokenCipher() != null && !bot.getDiscordTokenCipher().isBlank(),
            bot.getCreatedAt()
        );
    }
}
