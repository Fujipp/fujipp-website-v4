package fujipp.project.billing.dto;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import fujipp.project.billing.model.FeatureVariableTemplate;

/** One config field definition (mirrors the frontend FeatureConfigField). */
public record TemplateFieldResponse(
    String variableKey,
    String label,
    String description,
    String valueType,
    boolean isRequired,
    boolean isSensitive,
    String defaultValue,
    int sortOrder,
    JsonNode options
) {
    private static final ObjectMapper MAPPER = new ObjectMapper();

    public static TemplateFieldResponse from(FeatureVariableTemplate t) {
        return new TemplateFieldResponse(
            t.getVariableKey(),
            t.getLabel(),
            t.getDescription(),
            t.getValueType(),
            t.isRequired(),
            t.isSensitive(),
            t.getDefaultValue(),
            t.getSortOrder(),
            parseOptions(t.getOptions())
        );
    }

    /** ENUM choices arrive as raw JSON text; emit them as a real array (null when absent). */
    private static JsonNode parseOptions(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try {
            return MAPPER.readTree(raw);
        } catch (Exception e) {
            return null;
        }
    }
}
