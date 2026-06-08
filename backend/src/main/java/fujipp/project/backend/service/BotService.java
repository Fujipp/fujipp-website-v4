package fujipp.project.backend.service;

import fujipp.project.backend.dto.BotResponse;
import fujipp.project.backend.dto.CreateBotRequest;
import fujipp.project.backend.model.BotInstance;
import fujipp.project.backend.repository.BotInstanceRepository;
import fujipp.project.backend.security.SecretCipher;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BotService {

    private final BotInstanceRepository bots;
    private final SecretCipher cipher;

    @Transactional(readOnly = true)
    public List<BotResponse> listBots(UUID userId) {
        return bots.findByUserIdOrderByCreatedAtDesc(userId).stream().map(BotResponse::from).toList();
    }

    /** Throws 404 if the bot does not exist or is not owned by this user. */
    @Transactional(readOnly = true)
    public void assertOwnership(UUID userId, UUID botId) {
        bots.findByIdAndUserId(botId, userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Bot not found"));
    }

    @Transactional
    public BotResponse createBot(UUID userId, CreateBotRequest request) {
        if (bots.existsByUserIdAndName(userId, request.name())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "You already have a bot with this name");
        }
        BotInstance bot = new BotInstance();
        bot.setUserId(userId);
        bot.setName(request.name());
        bot.setDiscordApplicationId(request.discordApplicationId());
        bot.setDiscordGuildId(request.discordGuildId());
        bot.setDiscordTokenCipher(cipher.encrypt(request.discordToken()));
        bot.setStatus("CREATED");
        return BotResponse.from(bots.save(bot));
    }
}
