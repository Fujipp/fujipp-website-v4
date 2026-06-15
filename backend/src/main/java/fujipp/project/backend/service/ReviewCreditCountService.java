package fujipp.project.backend.service;

import fujipp.project.backend.billing.BillingClient;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Read/write the review-credit counter (shop.review_credit_state) for a bot's review
 * channel. The backend reaches the shop schema as service_role (same as bots.*). The
 * channel is taken from the bot's REVIEW_CHANNEL_ID config.
 */
@Service
@RequiredArgsConstructor
public class ReviewCreditCountService {

    private final JdbcTemplate jdbc;
    private final BillingClient billing;
    private final ObjectMapper objectMapper = new ObjectMapper();

    /** Current counter for the bot's review channel: { channelId, count, counted }. */
    @Transactional(readOnly = true)
    public Map<String, Object> getCount(UUID botId) {
        List<Map<String, Object>> rows = jdbc.queryForList(
            "SELECT channel_id, message_count FROM shop.review_credit_state WHERE external_subject_id = ?",
            botId.toString());
        if (!rows.isEmpty()) {
            Map<String, Object> r = rows.get(0);
            return Map.of(
                "channelId", String.valueOf(r.get("channel_id")),
                "count", ((Number) r.get("message_count")).longValue(),
                "counted", true);
        }
        String channel = reviewChannelId(botId);
        return Map.of("channelId", channel == null ? "" : channel, "count", 0L, "counted", false);
    }

    /** Set the counter to an absolute value. Channel comes from REVIEW_CHANNEL_ID config. */
    @Transactional
    public Map<String, Object> setCount(UUID botId, long count) {
        if (count < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "count must be >= 0");
        }
        String channel = reviewChannelId(botId);
        if (channel == null || channel.isBlank()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "ยังไม่ได้ตั้งห้องรีวิว (REVIEW_CHANNEL_ID)");
        }
        jdbc.update(
            "INSERT INTO shop.review_credit_state (external_subject_id, channel_id, message_count) "
            + "VALUES (?, ?, ?) "
            + "ON CONFLICT (external_subject_id, channel_id) DO UPDATE SET message_count = EXCLUDED.message_count",
            botId.toString(), channel, count);
        return getCount(botId);
    }

    /** Clear the counter so the bot re-counts the whole channel on its next start. */
    @Transactional
    public void resetForRecount(UUID botId) {
        jdbc.update("DELETE FROM shop.review_credit_state WHERE external_subject_id = ?", botId.toString());
    }

    private String reviewChannelId(UUID botId) {
        try {
            JsonNode values = objectMapper.readTree(billing.getBotConfig(botId.toString())).path("values");
            JsonNode v = values.path("REVIEW_CHANNEL_ID");
            return v.isMissingNode() || v.isNull() ? null : v.asText();
        } catch (RuntimeException e) {
            return null;
        }
    }
}
