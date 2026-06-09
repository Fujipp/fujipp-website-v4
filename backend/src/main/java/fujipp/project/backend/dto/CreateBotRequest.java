package fujipp.project.backend.dto;

import jakarta.validation.constraints.NotBlank;

import java.util.UUID;

/**
 * Create a bot. The customer pastes their own Discord bot credentials; the token
 * is encrypted before storage. application/guild id are optional at creation and
 * can be filled in later (e.g. after inviting the bot to the server).
 *
 * When {@code runtimePlanId} is set, creating the bot also buys runtime: a slot is
 * reserved on a VPS host and the customer's wallet is charged in one step. Leave it
 * null to just register the bot without a runtime (no charge, no slot).
 */
public record CreateBotRequest(
    @NotBlank(message = "name is required")
    String name,

    @NotBlank(message = "discordToken is required")
    String discordToken,

    String discordApplicationId,

    String discordGuildId,

    // Optional extra Discord credentials (application id doubles as the client id).
    String discordPublicKey,

    String discordClientSecret,

    // Optional: buy runtime + reserve a VPS slot while creating the bot.
    UUID runtimePlanId
) {}
