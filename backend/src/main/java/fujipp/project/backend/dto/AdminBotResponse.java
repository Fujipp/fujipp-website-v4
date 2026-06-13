package fujipp.project.backend.dto;

import fujipp.project.backend.model.BotInstance;
import fujipp.project.backend.model.Profile;

import java.time.OffsetDateTime;
import java.util.UUID;

/** A bot plus its owner, for the admin bot directory. Never exposes the token. */
public record AdminBotResponse(
    UUID id,
    String name,
    String status,
    UUID ownerId,
    String ownerName,
    String ownerEmail,
    String discordApplicationId,
    String discordGuildId,
    boolean tokenConfigured,
    UUID vpsNodeId,
    OffsetDateTime createdAt
) {
    public static AdminBotResponse from(BotInstance bot, Profile owner) {
        return new AdminBotResponse(
            bot.getId(),
            bot.getName(),
            bot.getStatus(),
            bot.getUserId(),
            owner != null ? (owner.getDisplayName() != null ? owner.getDisplayName() : owner.getUsername()) : null,
            owner != null ? owner.getEmail() : null,
            bot.getDiscordApplicationId(),
            bot.getDiscordGuildId(),
            bot.getDiscordTokenCipher() != null && !bot.getDiscordTokenCipher().isBlank(),
            bot.getVpsNodeId(),
            bot.getCreatedAt()
        );
    }
}
