// Feature config model — the frontend mirror of billing.feature_variable_templates.
// The config form is rendered dynamically from these definitions, so adding a
// feature in the backbone (a new catalog row + templates) needs no new UI.

export type ConfigValueType =
    | "STRING"
    | "TEXT"
    | "NUMBER"
    | "BOOLEAN"
    | "CHANNEL_ID"
    | "ROLE_ID"
    | "USER_ID"
    | "SECRET"
    | "JSON"
    // Stored as a JSON string array, but edited as one item per line (no brackets/quotes).
    | "STRING_LIST";

export interface FeatureConfigField {
    variableKey: string;
    label: string;
    description?: string;
    valueType: ConfigValueType;
    isRequired: boolean;
    isSensitive: boolean;
    defaultValue?: string;
    sortOrder: number;
}

export interface FeatureDefinition {
    code: string;
    name: string;
    fields: FeatureConfigField[];
}

/** Shape of GET /api/bots/:botId/config. */
export interface BotConfigResponse {
    features: FeatureDefinition[];
    values: Record<string, string>;
    channels?: { id: string; name: string }[];
    roles?: { id: string; name: string }[];
}
