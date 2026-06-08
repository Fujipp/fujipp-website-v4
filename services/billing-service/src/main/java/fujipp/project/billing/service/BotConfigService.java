package fujipp.project.billing.service;

import fujipp.project.billing.dto.FeatureConfigResponse;
import fujipp.project.billing.dto.FeatureWithFieldsResponse;
import fujipp.project.billing.dto.TemplateFieldResponse;
import fujipp.project.billing.model.FeatureCatalog;
import fujipp.project.billing.model.FeatureConfigValue;
import fujipp.project.billing.model.FeatureSubscription;
import fujipp.project.billing.model.FeatureVariableTemplate;
import fujipp.project.billing.repository.FeatureCatalogRepository;
import fujipp.project.billing.repository.FeatureConfigValueRepository;
import fujipp.project.billing.repository.FeatureSubscriptionRepository;
import fujipp.project.billing.repository.FeatureVariableTemplateRepository;
import fujipp.project.billing.security.SecretCipher;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Reads/writes a bot's (subject's) feature config. The form is built from the
 * features the bot owns + their templates; secrets are encrypted on write and
 * never returned on read.
 */
@Service
@RequiredArgsConstructor
public class BotConfigService {

    private static final List<String> LIVE = List.of("ACTIVE", "PAST_DUE");

    private final FeatureSubscriptionRepository subscriptions;
    private final FeatureCatalogRepository features;
    private final FeatureVariableTemplateRepository templates;
    private final FeatureConfigValueRepository configValues;
    private final SecretCipher cipher;

    @Transactional(readOnly = true)
    public FeatureConfigResponse getConfig(String subjectId) {
        List<UUID> featureIds = liveFeatureIds(subjectId);
        if (featureIds.isEmpty()) {
            return new FeatureConfigResponse(List.of(), Map.of());
        }

        Map<UUID, FeatureCatalog> catalogById = features.findAllById(featureIds).stream()
            .collect(Collectors.toMap(FeatureCatalog::getId, f -> f));
        Map<UUID, List<FeatureVariableTemplate>> templatesByFeature =
            templates.findByFeatureIdInOrderBySortOrder(featureIds).stream()
                .collect(Collectors.groupingBy(FeatureVariableTemplate::getFeatureId));

        List<FeatureWithFieldsResponse> featureList = new ArrayList<>();
        for (UUID fid : featureIds) {
            FeatureCatalog cat = catalogById.get(fid);
            if (cat == null) continue;
            List<TemplateFieldResponse> fields = templatesByFeature.getOrDefault(fid, List.of()).stream()
                .map(TemplateFieldResponse::from).toList();
            featureList.add(new FeatureWithFieldsResponse(cat.getCode(), cat.getName(), fields));
        }

        Map<String, String> values = new HashMap<>();
        for (FeatureConfigValue v : configValues.findByExternalSubjectId(subjectId)) {
            if (!v.isSecret() && v.getConfigValue() != null) {
                values.put(v.getConfigKey(), v.getConfigValue());
            }
        }
        return new FeatureConfigResponse(featureList, values);
    }

    @Transactional
    public FeatureConfigResponse updateConfig(String subjectId, Map<String, String> incoming) {
        List<FeatureSubscription> subs = subscriptions.findByExternalSubjectIdAndStatusIn(subjectId, LIVE);
        if (subs.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Bot has no active features to configure");
        }
        UUID userId = subs.get(0).getUserId();
        List<UUID> featureIds = subs.stream().map(FeatureSubscription::getFeatureId).distinct().toList();

        Map<String, FeatureVariableTemplate> byKey = new HashMap<>();
        for (FeatureVariableTemplate t : templates.findByFeatureIdInOrderBySortOrder(featureIds)) {
            byKey.putIfAbsent(t.getVariableKey(), t);
        }

        if (incoming != null) {
            for (Map.Entry<String, String> entry : incoming.entrySet()) {
                FeatureVariableTemplate t = byKey.get(entry.getKey());
                if (t == null) continue; // unknown key — ignore
                String raw = entry.getValue();
                if (t.isSensitive() && (raw == null || raw.isBlank())) {
                    continue; // keep the saved secret
                }
                String stored = t.isSensitive() ? cipher.encrypt(raw) : raw;
                upsert(userId, subjectId, t.getFeatureId(), entry.getKey(), stored, t.isSensitive());
            }
        }
        return getConfig(subjectId);
    }

    private List<UUID> liveFeatureIds(String subjectId) {
        return subscriptions.findByExternalSubjectIdAndStatusIn(subjectId, LIVE).stream()
            .map(FeatureSubscription::getFeatureId).distinct().toList();
    }

    private void upsert(UUID userId, String subjectId, UUID featureId, String key, String value, boolean secret) {
        FeatureConfigValue row = configValues
            .findByExternalSubjectIdAndFeatureIdAndConfigKey(subjectId, featureId, key)
            .orElseGet(FeatureConfigValue::new);
        row.setUserId(userId);
        row.setExternalSubjectId(subjectId);
        row.setFeatureId(featureId);
        row.setConfigKey(key);
        row.setConfigValue(value);
        row.setSecret(secret);
        configValues.save(row);
    }
}
