package fujipp.project.backend.dto;

/**
 * Update a bot's settings. All fields optional. A blank/omitted token or client
 * secret keeps the existing (encrypted) value; the other fields are set as sent.
 */
public record UpdateBotRequest(
    String name,
    String discordToken,
    String discordApplicationId,
    String discordGuildId,
    String discordPublicKey,
    String discordClientSecret
) {}
