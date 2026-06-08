package fujipp.project.backend.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Create a bot. The customer pastes their own Discord bot credentials; the token
 * is encrypted before storage. application/guild id are optional at creation and
 * can be filled in later (e.g. after inviting the bot to the server).
 */
public record CreateBotRequest(
    @NotBlank(message = "name is required")
    String name,

    @NotBlank(message = "discordToken is required")
    String discordToken,

    String discordApplicationId,

    String discordGuildId
) {}
