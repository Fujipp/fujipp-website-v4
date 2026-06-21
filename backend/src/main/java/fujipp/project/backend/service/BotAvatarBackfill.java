package fujipp.project.backend.service;

import fujipp.project.backend.discord.DiscordBotClient;
import fujipp.project.backend.model.BotInstance;
import fujipp.project.backend.repository.BotInstanceRepository;
import fujipp.project.backend.security.SecretCipher;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * One-time backfill for bots created before avatar caching existed (their
 * discord_avatar_url is null). After startup, a background thread fetches the avatar
 * for each such bot (decrypt token → Discord) and persists it, so their Bot cards show
 * the real picture without the owner having to re-save the token.
 *
 * It runs off the boot thread so it never blocks readiness, and only selects bots that
 * still lack an avatar — so once every bot is filled it has nothing to do. Bots whose
 * token is invalid simply stay null (and are retried on the next boot; that set is small).
 */
@Component
@RequiredArgsConstructor
public class BotAvatarBackfill {

    private static final Logger log = LoggerFactory.getLogger(BotAvatarBackfill.class);

    private final BotInstanceRepository bots;
    private final SecretCipher cipher;
    private final DiscordBotClient discord;

    @EventListener(ApplicationReadyEvent.class)
    public void onReady() {
        Thread thread = new Thread(this::run, "bot-avatar-backfill");
        thread.setDaemon(true);
        thread.start();
    }

    private void run() {
        List<BotInstance> pending;
        try {
            pending = bots.findByDiscordAvatarUrlIsNullAndDiscordTokenCipherIsNotNull();
        } catch (RuntimeException e) {
            log.warn("Bot avatar backfill query failed: {}", e.getMessage());
            return;
        }
        if (pending.isEmpty()) {
            return;
        }

        int filled = 0;
        for (BotInstance bot : pending) {
            try {
                String url = discord.fetchAvatarUrl(cipher.decrypt(bot.getDiscordTokenCipher()));
                if (url != null) {
                    bot.setDiscordAvatarUrl(url);
                    bots.save(bot);
                    filled++;
                }
            } catch (RuntimeException e) {
                log.warn("Bot avatar backfill failed for {}: {}", bot.getId(), e.getMessage());
            }
        }
        log.info("Bot avatar backfill: filled {}/{} bot(s)", filled, pending.size());
    }
}
