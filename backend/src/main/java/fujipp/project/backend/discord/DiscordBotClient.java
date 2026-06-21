package fujipp.project.backend.discord;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

/**
 * Thin client for the bits of the Discord API we need server-side. Currently only
 * resolves a bot's avatar: Discord serves avatars via the CDN but the avatar hash is
 * only available from an authenticated {@code GET /users/@me} (Bot auth) — it can't be
 * built from the application id alone — so we fetch it once and cache the URL on the bot.
 *
 * Every call is best-effort: a bad token, network error, or unexpected body yields
 * {@code null} so avatar resolution never blocks bot creation.
 */
@Component
public class DiscordBotClient {

    private static final Logger log = LoggerFactory.getLogger(DiscordBotClient.class);
    private static final String CDN = "https://cdn.discordapp.com";

    private final RestClient http;

    public DiscordBotClient() {
        this.http = RestClient.builder().baseUrl("https://discord.com/api/v10").build();
    }

    /** Resolve the bot user's avatar CDN URL, or {@code null} if it can't be fetched. */
    public String fetchAvatarUrl(String botToken) {
        if (botToken == null || botToken.isBlank()) {
            return null;
        }
        try {
            DiscordUser user = http.get()
                .uri("/users/@me")
                .header("Authorization", "Bot " + botToken.trim())
                .retrieve()
                .body(DiscordUser.class);

            if (user == null || user.id() == null || user.id().isBlank()) {
                return null;
            }
            if (user.avatar() != null && !user.avatar().isBlank()) {
                String ext = user.avatar().startsWith("a_") ? "gif" : "png";
                return CDN + "/avatars/" + user.id() + "/" + user.avatar() + "." + ext + "?size=128";
            }
            // No custom avatar — fall back to Discord's default set ((id >> 22) % 6).
            long index = Long.remainderUnsigned(Long.parseUnsignedLong(user.id()) >>> 22, 6);
            return CDN + "/embed/avatars/" + index + ".png";
        } catch (Exception e) {
            log.warn("Discord avatar fetch failed: {}", e.getMessage());
            return null;
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record DiscordUser(String id, String avatar) {}
}
