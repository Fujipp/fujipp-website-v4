package fujipp.project.backend.dto;

import fujipp.project.backend.billing.BillingClient;
import fujipp.project.backend.model.BotInstance;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Safe view of a bot — never exposes the encrypted token.
 *
 * {@code status} is the orchestrator process state (CREATED/RUNNING/…). The
 * shop-facing lifecycle is {@code runtimeStatus}, DERIVED from the runtime assigned
 * to this bot:
 *   ONLINE  — an active runtime is assigned and not past its period end
 *   EXPIRED — a runtime is assigned but lapsed (suspended/past-due/past end)
 *   OFFLINE — no runtime assigned
 *   null    — not computed for this response (e.g. a create/settings-save echo)
 */
public record BotResponse(
    UUID id,
    String name,
    String status,
    String discordApplicationId,
    String discordGuildId,
    boolean tokenConfigured,
    String avatarUrl,
    OffsetDateTime createdAt,
    String runtimeStatus,
    LocalDate runtimeExpiresAt,
    UUID runtimeId
) {
    /** View without runtime lifecycle computed (runtimeStatus = null). */
    public static BotResponse from(BotInstance bot) {
        return build(bot, null, null, null);
    }

    /** Enriched view: derives the shop lifecycle from the runtime assigned to this bot (or null). */
    public static BotResponse from(BotInstance bot, BillingClient.RuntimeSubView runtime) {
        if (runtime == null) {
            return build(bot, "OFFLINE", null, null);
        }
        LocalDate expiresAt = runtime.currentPeriodEnd();
        boolean online = "ACTIVE".equals(runtime.status())
            && expiresAt != null && !expiresAt.isBefore(LocalDate.now());
        return build(bot, online ? "ONLINE" : "EXPIRED", expiresAt, runtime.id());
    }

    private static BotResponse build(BotInstance bot, String runtimeStatus,
                                     LocalDate runtimeExpiresAt, UUID runtimeId) {
        return new BotResponse(
            bot.getId(),
            bot.getName(),
            bot.getStatus(),
            bot.getDiscordApplicationId(),
            bot.getDiscordGuildId(),
            bot.getDiscordTokenCipher() != null && !bot.getDiscordTokenCipher().isBlank(),
            bot.getDiscordAvatarUrl(),
            bot.getCreatedAt(),
            runtimeStatus,
            runtimeExpiresAt,
            runtimeId
        );
    }
}
