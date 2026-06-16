package fujipp.project.voucher.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Checks that an {@code X-Client-Id} is a real bot we run on the platform — a row in
 * {@code bots.bot_instances} (the subject id central-bot sends). This is how redeem is
 * locked to "only our platform's bots": every shop that buys the top-up feature has a
 * bot row, so it works automatically as new shops appear, while an outside caller — even
 * one holding the shared token — does not, because it has no subject id we issued.
 *
 * <p>Reads the shared Supabase DB directly (same datasource as the {@code voucher} schema).
 * Fails closed: a malformed id or a DB error denies the caller.
 */
@Component
public class PlatformClientValidator {

    private static final Logger log = LoggerFactory.getLogger(PlatformClientValidator.class);

    private final JdbcTemplate jdbc;

    public PlatformClientValidator(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public boolean isPlatformBot(String clientId) {
        UUID id;
        try {
            id = UUID.fromString(clientId);
        } catch (IllegalArgumentException | NullPointerException e) {
            return false; // not a subject id → not one of our bots
        }
        try {
            Boolean exists = jdbc.queryForObject(
                    "SELECT EXISTS(SELECT 1 FROM bots.bot_instances WHERE id = ?)",
                    Boolean.class, id);
            return Boolean.TRUE.equals(exists);
        } catch (RuntimeException e) {
            log.warn("Platform client check failed for {} — denying", clientId, e);
            return false; // fail closed
        }
    }
}
