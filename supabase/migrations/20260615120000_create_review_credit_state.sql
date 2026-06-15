-- ═════════════════════════════════════════════════════════════════════════════
-- Review Credit state (layer B)
--
-- Persistent counter for the review-credit feature — replaces the legacy bot's
-- local data/config.json. One row per (bot, review channel): the running message
-- count that drives the channel name, and the id of the last bot reply so the
-- next reply can delete the previous one.
--
-- Accessed only by central-bot (Node, service_role) — NOT exposed to the Data API.
-- Members are Discord users (not public.profiles), so there is no platform FK.
-- ═════════════════════════════════════════════════════════════════════════════

CREATE SCHEMA IF NOT EXISTS shop;
GRANT USAGE ON SCHEMA shop TO service_role;


CREATE TABLE IF NOT EXISTS shop.review_credit_state (
    id                  UUID        NOT NULL DEFAULT gen_random_uuid(),
    external_subject_id TEXT        NOT NULL,
    channel_id          TEXT        NOT NULL,
    message_count       BIGINT      NOT NULL DEFAULT 0,
    last_bot_message_id TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT review_credit_state_pkey        PRIMARY KEY (id),
    CONSTRAINT review_credit_state_subject_channel_key UNIQUE (external_subject_id, channel_id),
    CONSTRAINT review_credit_state_count_nonneg CHECK (message_count >= 0)
);
CREATE INDEX IF NOT EXISTS idx_review_credit_state_subject
    ON shop.review_credit_state (external_subject_id);


CREATE OR REPLACE TRIGGER review_credit_state_set_updated_at
    BEFORE UPDATE ON shop.review_credit_state
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- RLS — defense in depth; service_role only (central-bot via pg pool).
ALTER TABLE shop.review_credit_state ENABLE ROW LEVEL SECURITY;
GRANT ALL ON shop.review_credit_state TO service_role;
CREATE POLICY review_credit_state_service_all ON shop.review_credit_state
    TO service_role USING (true) WITH CHECK (true);
