package fujipp.project.billing.dto;

public record UpdateFeatureRequest(String name, String description, String iconKey) {
    public record FieldUpdate(
        String label,
        String description,
        String valueType,
        Boolean required,
        Boolean sensitive,
        String defaultValue,
        String options,
        Integer sortOrder
    ) {}
}
