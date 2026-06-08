package fujipp.project.billing.dto;

import java.util.List;

/** A feature the bot owns, with its config field schema. */
public record FeatureWithFieldsResponse(
    String code,
    String name,
    List<TemplateFieldResponse> fields
) {}
