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
 * shop-facing lifecycle is {@code runtimeStatus}, DERIVED from both the runtime
 * assigned to this bot AND whether its process is actually running:
 *   ONLINE  — entitled (active runtime, not past its period end) AND the process is RUNNING
 *   OFFLINE — no runtime assigned, or entitled but the process is stopped/crashed
 *   EXPIRED — a runtime is assigned but lapsed (suspended/past-due/past end)
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
        boolean entitled = "ACTIVE".equals(runtime.status())
            && expiresAt != null && !expiresAt.isBefore(LocalDate.now());
        if (!entitled) {
            return build(bot, "EXPIRED", expiresAt, runtime.id());
        }
        // Entitled — but the tag must reflect whether the bot process is actually up.
        // The orchestrator writes bot_instances.status RUNNING on start, STOPPED on stop.
        boolean running = "RUNNING".equals(bot.getStatus());
        return build(bot, running ? "ONLINE" : "OFFLINE", expiresAt, runtime.id());
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
