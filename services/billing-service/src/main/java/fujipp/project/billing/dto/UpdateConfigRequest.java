package fujipp.project.billing.dto;

import java.util.Map;

/**
 * Config values to upsert, keyed by variable_key. A blank value for a SECRET field
 * is ignored (keeps the existing secret); unknown keys are ignored.
 */
public record UpdateConfigRequest(
    Map<String, String> values
) {}
