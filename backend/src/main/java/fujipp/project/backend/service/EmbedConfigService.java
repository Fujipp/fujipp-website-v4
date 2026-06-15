package fujipp.project.backend.service;

import fujipp.project.backend.billing.BillingClient;
import fujipp.project.backend.repository.BotInstanceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

import java.sql.Array;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Per-bot embed configuration (config layer 3). Reads the slot registry
 * (bots.embed_slots) joined with the bot's overrides (bots.bot_embeds) and lets the
 * owner save an override. Uses JdbcTemplate so the jsonb columns stay raw JSON and no
 * JPA entity has to model them.
 */
@Service
@RequiredArgsConstructor
public class EmbedConfigService {

    private final JdbcTemplate jdbc;
    private final BotInstanceRepository bots;
    private final BillingClient billing;
    private final ObjectMapper objectMapper = new ObjectMapper();

    /** Every slot with its effective embed (seeded default merged with any bot override). */
    @Transactional(readOnly = true)
    public String listEmbeds(UUID userId, UUID botId) {
        assertOwner(userId, botId);
        return listEmbedsInternal(botId);
    }

    /** Admin: list embeds for any bot (no ownership check). */
    @Transactional(readOnly = true)
    public String listEmbedsForAdmin(UUID botId) {
        return listEmbedsInternal(botId);
    }

    private String listEmbedsInternal(UUID botId) {
        List<ObjectNode> rows = jdbc.query(
            """
            SELECT s.feature_code, s.slot_key, s.label, s.description, s.available_vars, s.sort_order,
                   (
                     COALESCE(b.embed_json, s.default_json)
                     || CASE
                          WHEN jsonb_typeof(s.default_json->'components') = 'object'
                            OR jsonb_typeof(COALESCE(b.embed_json, '{}'::jsonb)->'components') = 'object'
                          THEN jsonb_build_object(
                            'components',
                            COALESCE(s.default_json->'components', '{}'::jsonb)
                            || COALESCE(b.embed_json->'components', '{}'::jsonb)
                          )
                          ELSE '{}'::jsonb
                        END
                   )::text AS embed_text,
                   (b.id IS NOT NULL) AS overridden
              FROM bots.embed_slots s
              LEFT JOIN bots.bot_embeds b
                     ON b.slot_key = s.slot_key AND b.subject_id = ?
             ORDER BY s.sort_order
            """,
            (rs, i) -> {
                ObjectNode node = objectMapper.createObjectNode();
                node.put("featureCode", rs.getString("feature_code"));
                node.put("slotKey", rs.getString("slot_key"));
                node.put("label", rs.getString("label"));
                node.put("description", rs.getString("description"));
                node.put("overridden", rs.getBoolean("overridden"));
                ArrayNode vars = node.putArray("availableVars");
                Array arr = rs.getArray("available_vars");
                if (arr != null) {
                    for (Object v : (Object[]) arr.getArray()) vars.add(String.valueOf(v));
                }
                node.set("embed", readJson(rs.getString("embed_text")));
                return node;
            },
            botId.toString());

        // Only surface slots for features this bot actually owns — same feature set the
        // config form shows. null = couldn't determine (billing hiccup) → don't hide any.
        Set<String> enabled = enabledFeatureCodes(botId);

        ArrayNode out = objectMapper.createArrayNode();
        for (ObjectNode row : rows) {
            if (enabled == null || enabled.contains(row.get("featureCode").asText())) {
                out.add(row);
            }
        }
        return out.toString();
    }

    /**
     * Feature codes this subject owns, via the same billing source the config form uses
     * ({@code getBotConfig}). Returns {@code null} if billing can't be reached, so a
     * transient failure shows all slots rather than hiding the whole designer.
     */
    private Set<String> enabledFeatureCodes(UUID botId) {
        try {
            JsonNode root = objectMapper.readTree(billing.getBotConfig(botId.toString()));
            JsonNode features = root.get("features");
            if (features == null || !features.isArray()) return Set.of();
            Set<String> codes = new HashSet<>();
            for (JsonNode f : features) {
                JsonNode code = f.get("code");
                if (code != null && !code.isNull()) codes.add(code.asText());
            }
            return codes;
        } catch (RuntimeException e) {
            return null;
        }
    }

    /** The effective embed JSON for one slot. */
    @Transactional(readOnly = true)
    public String getEmbed(UUID userId, UUID botId, String slotKey) {
        assertOwner(userId, botId);
        return getEmbedInternal(botId, slotKey);
    }

    /** Admin: effective embed for one slot of any bot (no ownership check). */
    @Transactional(readOnly = true)
    public String getEmbedForAdmin(UUID botId, String slotKey) {
        return getEmbedInternal(botId, slotKey);
    }

    private String getEmbedInternal(UUID botId, String slotKey) {
        List<String> found = jdbc.query(
            """
            SELECT (
                     COALESCE(b.embed_json, s.default_json)
                     || CASE
                          WHEN jsonb_typeof(s.default_json->'components') = 'object'
                            OR jsonb_typeof(COALESCE(b.embed_json, '{}'::jsonb)->'components') = 'object'
                          THEN jsonb_build_object(
                            'components',
                            COALESCE(s.default_json->'components', '{}'::jsonb)
                            || COALESCE(b.embed_json->'components', '{}'::jsonb)
                          )
                          ELSE '{}'::jsonb
                        END
                   )::text AS embed_text
              FROM bots.embed_slots s
              LEFT JOIN bots.bot_embeds b
                     ON b.slot_key = s.slot_key AND b.subject_id = ?
             WHERE s.slot_key = ?
             LIMIT 1
            """,
            (rs, i) -> rs.getString("embed_text"),
            botId.toString(), slotKey);
        if (found.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Unknown embed slot");
        }
        return found.get(0);
    }

    /** Save (upsert) a bot's override for one slot. Body must be a valid JSON object. */
    @Transactional
    public String saveEmbed(UUID userId, UUID botId, String slotKey, String embedJson) {
        assertOwner(userId, botId);
        return saveEmbedInternal(botId, slotKey, embedJson);
    }

    /** Admin: save an embed override for any bot (no ownership check). */
    @Transactional
    public String saveEmbedForAdmin(UUID botId, String slotKey, String embedJson) {
        return saveEmbedInternal(botId, slotKey, embedJson);
    }

    private String saveEmbedInternal(UUID botId, String slotKey, String embedJson) {
        Integer exists = jdbc.query(
            "SELECT 1 FROM bots.embed_slots WHERE slot_key = ? LIMIT 1",
            rs -> rs.next() ? 1 : null, slotKey);
        if (exists == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Unknown embed slot");
        }
        if (!isJsonObject(embedJson)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "embed must be a JSON object");
        }

        jdbc.update(
            """
            INSERT INTO bots.bot_embeds (subject_id, slot_key, embed_json)
            VALUES (?, ?, ?::jsonb)
            ON CONFLICT (subject_id, slot_key)
            DO UPDATE SET embed_json = EXCLUDED.embed_json, updated_at = now()
            """,
            botId.toString(), slotKey, embedJson);
        return embedJson;
    }

    private void assertOwner(UUID userId, UUID botId) {
        bots.findByIdAndUserId(botId, userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Bot not found"));
    }

    private JsonNode readJson(String text) {
        try {
            return text == null ? objectMapper.nullNode() : objectMapper.readTree(text);
        } catch (RuntimeException e) {
            return objectMapper.nullNode();
        }
    }

    private boolean isJsonObject(String text) {
        try {
            return objectMapper.readTree(text).isObject();
        } catch (Exception e) {
            return false;
        }
    }
}
