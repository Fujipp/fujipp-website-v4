package fujipp.project.backend.service;

import fujipp.project.backend.billing.BillingClient;
import fujipp.project.backend.discord.DiscordBotClient;
import fujipp.project.backend.dto.BotResponse;
import fujipp.project.backend.dto.BotSlotInfo;
import fujipp.project.backend.dto.CreateBotRequest;
import fujipp.project.backend.dto.UpdateBotRequest;
import fujipp.project.backend.model.BotInstance;
import fujipp.project.backend.repository.BotInstanceRepository;
import fujipp.project.backend.security.SecretCipher;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BotService {

    private final BotInstanceRepository bots;
    private final SecretCipher cipher;
    private final BillingClient billing;
    private final DiscordBotClient discord;

    @Transactional(readOnly = true)
    public List<BotResponse> listBots(UUID userId) {
        Map<String, BillingClient.RuntimeSubView> byBot = runtimeByBot(userId);
        return bots.findByUserIdOrderByCreatedAtDesc(userId).stream()
            .map(b -> BotResponse.from(b, byBot.get(b.getId().toString())))
            .toList();
    }

    /** Map of bot id → the runtime that decides its online/offline status (active preferred). */
    private Map<String, BillingClient.RuntimeSubView> runtimeByBot(UUID userId) {
        Map<String, BillingClient.RuntimeSubView> map = new HashMap<>();
        for (BillingClient.RuntimeSubView rt : billing.runtimeSubs(userId)) {
            String botId = rt.externalSubjectId();
            if (botId == null) continue; // bought-but-unassigned runtime powers no bot
            BillingClient.RuntimeSubView current = map.get(botId);
            if (current == null || prefer(rt, current)) map.put(botId, rt);
        }
        return map;
    }

    /** Prefer an ACTIVE runtime, then the one running latest — so a bot's badge reflects its live seat. */
    private static boolean prefer(BillingClient.RuntimeSubView a, BillingClient.RuntimeSubView b) {
        boolean aActive = "ACTIVE".equals(a.status());
        boolean bActive = "ACTIVE".equals(b.status());
        if (aActive != bActive) return aActive;
        if (a.currentPeriodEnd() == null) return false;
        if (b.currentPeriodEnd() == null) return true;
        return a.currentPeriodEnd().isAfter(b.currentPeriodEnd());
    }

    /** The user's bot-slot standing: bots used vs allowance (free + paid), and price of one more. */
    @Transactional(readOnly = true)
    public BotSlotInfo botSlots(UUID userId) {
        long used = bots.countByUserId(userId);
        BillingClient.BotSlotView v = billing.getBotSlots(userId);
        return BotSlotInfo.of(used, v.freeCount(), v.paidSlots(), v.priceSatang());
    }

    /** Buy one permanent bot slot (charged in billing), then return the updated standing. */
    public BotSlotInfo purchaseSlot(UUID userId) {
        billing.purchaseBotSlot(userId, UUID.randomUUID().toString());
        return botSlots(userId);
    }

    /** Throws 404 if the bot does not exist or is not owned by this user. */
    @Transactional(readOnly = true)
    public void assertOwnership(UUID userId, UUID botId) {
        owned(userId, botId);
    }

    @Transactional(readOnly = true)
    public BotResponse getBot(UUID userId, UUID botId) {
        BotInstance bot = owned(userId, botId);
        return BotResponse.from(bot, runtimeByBot(userId).get(botId.toString()));
    }

    @Transactional
    public BotResponse updateBot(UUID userId, UUID botId, UpdateBotRequest request) {
        BotInstance bot = owned(userId, botId);
        if (request.name() != null && !request.name().isBlank() && !request.name().equals(bot.getName())) {
            if (bots.existsByUserIdAndName(userId, request.name())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "You already have a bot with this name");
            }
            bot.setName(request.name());
        }
        if (request.discordApplicationId() != null) bot.setDiscordApplicationId(blankToNull(request.discordApplicationId()));
        if (request.discordGuildId() != null) bot.setDiscordGuildId(blankToNull(request.discordGuildId()));
        if (request.discordPublicKey() != null) bot.setDiscordPublicKey(blankToNull(request.discordPublicKey()));
        String discordToken = cleanSecret(request.discordToken());
        if (discordToken != null) {
            bot.setDiscordTokenCipher(cipher.encrypt(discordToken));
            // Token changed — refresh the cached avatar (best-effort, may be null).
            bot.setDiscordAvatarUrl(discord.fetchAvatarUrl(discordToken));
        }
        String discordClientSecret = cleanSecret(request.discordClientSecret());
        if (discordClientSecret != null) {
            bot.setDiscordClientSecretCipher(cipher.encrypt(discordClientSecret));
        }
        return BotResponse.from(bots.save(bot));
    }

    private BotInstance owned(UUID userId, UUID botId) {
        return bots.findByIdAndUserId(botId, userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Bot not found"));
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s;
    }

    /**
     * Create a bot. A bot is just registered here — it consumes a permanent Bot Slot
     * but NOT a VPS seat. Runtime (what makes a bot online) is bought separately from
     * the server cabinet and assigned to the bot, so creating a bot never charges or
     * reserves a host seat. {@code runtimePlanId} on the request is ignored.
     */
    public BotResponse createBot(UUID userId, CreateBotRequest request) {
        // Bot Slot gate: a user may own at most free_count + paid_slots bots. Buying a
        // permanent slot raises the cap; runtime (online/offline) is a separate thing.
        BotSlotInfo slots = botSlots(userId);
        if (!slots.canCreate()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "BOT_SLOT_LIMIT: you've used all " + slots.maxSlots()
                    + " bot slots — buy another slot to create more bots");
        }
        if (bots.existsByUserIdAndName(userId, request.name())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "You already have a bot with this name");
        }
        BotInstance bot = buildBot(userId, request);
        return BotResponse.from(bots.save(bot));
    }

    private BotInstance buildBot(UUID userId, CreateBotRequest request) {
        BotInstance bot = new BotInstance();
        bot.setUserId(userId);
        bot.setName(request.name());
        bot.setDiscordApplicationId(request.discordApplicationId());
        bot.setDiscordGuildId(request.discordGuildId());
        String discordToken = cleanSecret(request.discordToken());
        bot.setDiscordTokenCipher(cipher.encrypt(discordToken));
        bot.setDiscordAvatarUrl(discord.fetchAvatarUrl(discordToken));
        bot.setDiscordPublicKey(request.discordPublicKey());
        String discordClientSecret = cleanSecret(request.discordClientSecret());
        if (discordClientSecret != null) {
            bot.setDiscordClientSecretCipher(cipher.encrypt(discordClientSecret));
        }
        bot.setStatus("CREATED");
        return bot;
    }

    private static String cleanSecret(String s) {
        if (s == null) return null;
        String cleaned = s.trim();
        return cleaned.isBlank() ? null : cleaned;
    }
}
