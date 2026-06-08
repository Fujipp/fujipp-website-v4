package fujipp.project.billing.dto;

import java.util.List;
import java.util.Map;

/**
 * A bot's config form payload: the features it owns (with field schemas) and the
 * current non-secret values. Secret values are never returned (the form leaves
 * them blank = "keep the saved secret").
 */
public record FeatureConfigResponse(
    List<FeatureWithFieldsResponse> features,
    Map<String, String> values
) {}
