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
    int sortOrder
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
            t.getSortOrder()
        );
    }
}
