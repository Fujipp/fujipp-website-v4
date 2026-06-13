package fujipp.project.billing.service;

import fujipp.project.billing.repository.FeatureConfigValueRepository;
import fujipp.project.billing.repository.FeatureSubscriptionRepository;
import fujipp.project.billing.repository.RuntimeSubscriptionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Reassigns a bot's billing rows (runtime + feature subscriptions and config values,
 * all keyed by the subject id) to a new owner. The bot row itself lives in the bots
 * schema and is moved by the main backend; this covers the billing side, atomically.
 */
@Service
@RequiredArgsConstructor
public class AdminBotTransferService {

    private final RuntimeSubscriptionRepository runtimeSubs;
    private final FeatureSubscriptionRepository featureSubs;
    private final FeatureConfigValueRepository configValues;
    private final AdminAuditService audit;

    @Transactional
    public Map<String, Object> transfer(UUID adminId, String subjectId, UUID newUserId) {
        if (newUserId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "newUserId is required");
        }
        int runtime = runtimeSubs.reassignOwner(subjectId, newUserId);
        int features = featureSubs.reassignOwner(subjectId, newUserId);
        int config = configValues.reassignOwner(subjectId, newUserId);

        Map<String, Object> result = new HashMap<>();
        result.put("subjectId", subjectId);
        result.put("newUserId", newUserId.toString());
        result.put("runtimeSubs", runtime);
        result.put("featureSubs", features);
        result.put("configValues", config);
        audit.record(adminId, "BOT_TRANSFER", newUserId, "BOT", subjectId, result);
        return result;
    }
}
