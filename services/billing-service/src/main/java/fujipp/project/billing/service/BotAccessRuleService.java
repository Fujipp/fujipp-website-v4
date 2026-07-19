package fujipp.project.billing.service;

import fujipp.project.billing.dto.BotAccessRuleRequest;
import fujipp.project.billing.dto.BotAccessRuleResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BotAccessRuleService {

    private final JdbcTemplate jdbc;

    @Transactional(readOnly = true)
    public List<BotAccessRuleResponse> list(UUID botId) {
        requireBot(botId);
        return jdbc.query("""
            SELECT id, bot_id, feature_code, target_type, target_discord_id,
                   effect, is_enabled, created_at, updated_at
              FROM bots.bot_access_rules
             WHERE bot_id = ?
             ORDER BY feature_code, effect DESC, target_type, target_discord_id
            """, BotAccessRuleService::mapRule, botId);
    }

    @Transactional
    public BotAccessRuleResponse create(UUID botId, BotAccessRuleRequest request) {
        requireBot(botId);
        requireFeature(request.featureCode());
        try {
            return jdbc.queryForObject("""
                INSERT INTO bots.bot_access_rules
                    (bot_id, feature_code, target_type, target_discord_id, effect, is_enabled)
                VALUES (?, ?, ?, ?, ?, ?)
                RETURNING id, bot_id, feature_code, target_type, target_discord_id,
                          effect, is_enabled, created_at, updated_at
                """, BotAccessRuleService::mapRule, botId, request.featureCode(),
                request.targetType(), request.targetDiscordId(), request.effect(),
                request.enabled() == null || request.enabled());
        } catch (DuplicateKeyException exception) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Access rule already exists");
        }
    }

    @Transactional
    public BotAccessRuleResponse update(UUID botId, UUID ruleId, BotAccessRuleRequest request) {
        requireBot(botId);
        requireFeature(request.featureCode());
        try {
            List<BotAccessRuleResponse> rows = jdbc.query("""
                UPDATE bots.bot_access_rules
                   SET feature_code = ?, target_type = ?, target_discord_id = ?,
                       effect = ?, is_enabled = ?
                 WHERE id = ? AND bot_id = ?
                RETURNING id, bot_id, feature_code, target_type, target_discord_id,
                          effect, is_enabled, created_at, updated_at
                """, BotAccessRuleService::mapRule, request.featureCode(), request.targetType(),
                request.targetDiscordId(), request.effect(),
                request.enabled() == null || request.enabled(), ruleId, botId);
            if (rows.isEmpty()) throw notFound();
            return rows.getFirst();
        } catch (DuplicateKeyException exception) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Access rule already exists");
        }
    }

    @Transactional
    public void delete(UUID botId, UUID ruleId) {
        requireBot(botId);
        if (jdbc.update("DELETE FROM bots.bot_access_rules WHERE id = ? AND bot_id = ?", ruleId, botId) == 0) {
            throw notFound();
        }
    }

    private void requireBot(UUID botId) {
        Boolean exists = jdbc.queryForObject(
            "SELECT EXISTS (SELECT 1 FROM bots.bot_instances WHERE id = ?)", Boolean.class, botId);
        if (!Boolean.TRUE.equals(exists)) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Bot not found");
    }

    private void requireFeature(String featureCode) {
        if ("*".equals(featureCode)) return;
        Boolean exists = jdbc.queryForObject(
            "SELECT EXISTS (SELECT 1 FROM billing.feature_catalog WHERE code = ?)", Boolean.class, featureCode);
        if (!Boolean.TRUE.equals(exists)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown feature code");
        }
    }

    private static BotAccessRuleResponse mapRule(ResultSet rs, int rowNum) throws SQLException {
        return new BotAccessRuleResponse(
            rs.getObject("id", UUID.class), rs.getObject("bot_id", UUID.class),
            rs.getString("feature_code"), rs.getString("target_type"),
            rs.getString("target_discord_id"), rs.getString("effect"),
            rs.getBoolean("is_enabled"), rs.getTimestamp("created_at").toInstant(),
            rs.getTimestamp("updated_at").toInstant());
    }

    private static ResponseStatusException notFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "Access rule not found");
    }
}
