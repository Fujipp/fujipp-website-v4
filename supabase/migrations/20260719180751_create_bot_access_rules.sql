-- Core bot access rules. These rules belong to every bot instance rather than a
-- paid feature. `feature_code = '*'` applies to every routed feature; otherwise
-- the rule is scoped to one feature code.

CREATE TABLE IF NOT EXISTS bots.bot_access_rules (
    id                UUID        NOT NULL DEFAULT gen_random_uuid(),
    bot_id            UUID        NOT NULL,
    feature_code      TEXT        NOT NULL DEFAULT '*',
    target_type       TEXT        NOT NULL,
    target_discord_id TEXT        NOT NULL,
    effect            TEXT        NOT NULL,
    is_enabled        BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT bot_access_rules_pkey PRIMARY KEY (id),
    CONSTRAINT bot_access_rules_bot_fkey FOREIGN KEY (bot_id)
        REFERENCES bots.bot_instances (id) ON DELETE CASCADE,
    CONSTRAINT bot_access_rules_target_type_chk
        CHECK (target_type IN ('ROLE','USER')),
    CONSTRAINT bot_access_rules_effect_chk
        CHECK (effect IN ('ALLOW','DENY')),
    CONSTRAINT bot_access_rules_feature_code_chk
        CHECK (feature_code = '*' OR feature_code ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    CONSTRAINT bot_access_rules_target_id_chk
        CHECK (target_discord_id ~ '^[0-9]{15,22}$'),
    CONSTRAINT bot_access_rules_identity_key
        UNIQUE (bot_id, feature_code, target_type, target_discord_id, effect)
);

-- Runtime lookup: one indexed read loads all enabled global + feature rules for
-- a bot. The unique constraint above also serves exact-row edit/delete lookups.
CREATE INDEX IF NOT EXISTS idx_bot_access_rules_runtime
    ON bots.bot_access_rules (bot_id, feature_code)
    WHERE is_enabled = TRUE;

CREATE OR REPLACE TRIGGER bot_access_rules_set_updated_at
    BEFORE UPDATE ON bots.bot_access_rules
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE bots.bot_access_rules ENABLE ROW LEVEL SECURITY;
GRANT ALL ON bots.bot_access_rules TO service_role;

DROP POLICY IF EXISTS bot_access_rules_service_all ON bots.bot_access_rules;
CREATE POLICY bot_access_rules_service_all ON bots.bot_access_rules
    TO service_role USING (true) WITH CHECK (true);
