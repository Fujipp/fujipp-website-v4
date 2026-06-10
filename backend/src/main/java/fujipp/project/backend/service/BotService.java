package fujipp.project.backend.service;

import fujipp.project.backend.billing.BillingClient;
import fujipp.project.backend.dto.BotResponse;
import fujipp.project.backend.dto.CreateBotRequest;
import fujipp.project.backend.dto.UpdateBotRequest;
import fujipp.project.backend.model.BotInstance;
import fujipp.project.backend.repository.BotInstanceRepository;
import fujipp.project.backend.security.SecretCipher;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BotService {

    private static final Logger log = LoggerFactory.getLogger(BotService.class);

    private final BotInstanceRepository bots;
    private final SecretCipher cipher;
    private final PlacementService placement;
    private final BillingClient billing;

    @Transactional(readOnly = true)
    public List<BotResponse> listBots(UUID userId) {
        return bots.findByUserIdOrderByCreatedAtDesc(userId).stream().map(BotResponse::from).toList();
    }

    /** Throws 404 if the bot does not exist or is not owned by this user. */
    @Transactional(readOnly = true)
    public void assertOwnership(UUID userId, UUID botId) {
        owned(userId, botId);
    }

    @Transactional(readOnly = true)
    public BotResponse getBot(UUID userId, UUID botId) {
        return BotResponse.from(owned(userId, botId));
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
     * Create a bot. With no runtime plan it is just registered (no charge). With a
     * plan it also buys runtime: a VPS slot is reserved, then the wallet is charged.
     * If the charge fails the reserved slot is released (the bot row is deleted) so a
     * failed purchase never leaks a slot or leaves an unpaid bot.
     */
    public BotResponse createBot(UUID userId, CreateBotRequest request) {
        if (bots.existsByUserIdAndName(userId, request.name())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "You already have a bot with this name");
        }
        BotInstance bot = buildBot(userId, request);

        if (request.runtimePlanId() == null) {
            return BotResponse.from(bots.save(bot));
        }

        // Reserve a slot + persist (own transaction commits → slot is held), then charge.
        BotInstance placed = placement.placeAndPersist(bot);
        try {
            billing.purchaseRuntime(userId, request.runtimePlanId(), placed.getId().toString(),
                UUID.randomUUID().toString());
        } catch (RuntimeException e) {
            try {
                bots.deleteById(placed.getId());
            } catch (RuntimeException cleanup) {
                log.error("Failed to release slot for bot {} after charge failure", placed.getId(), cleanup);
            }
            throw e;
        }
        return BotResponse.from(placed);
    }

    private BotInstance buildBot(UUID userId, CreateBotRequest request) {
        BotInstance bot = new BotInstance();
        bot.setUserId(userId);
        bot.setName(request.name());
        bot.setDiscordApplicationId(request.discordApplicationId());
        bot.setDiscordGuildId(request.discordGuildId());
        bot.setDiscordTokenCipher(cipher.encrypt(cleanSecret(request.discordToken())));
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
