package fujipp.project.billing.dto;

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
    // ENUM choices as raw JSON text ([{"value":…,"label":…}, …]); the frontend parses it.
    // Kept as a String so this service needs no Jackson dependency on its compile classpath.
    String options
) {
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
            t.getOptions()
        );
    }
}
