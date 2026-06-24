-- ═════════════════════════════════════════════════════════════════════════════
-- Shop Order Counters (layer B) — running order count per log channel.
--
-- Backs the order-management feature (port of legacy discord-bot-002-idaxdshop
-- /order): each completed sale bumps a per-channel counter the bot stamps onto the
-- log channel's name (⭐ㆍเครดิตส่งของㆍ{count}). Scoped by external_subject_id (the bot)
-- + channel_id. Accessed only by central-bot (Node, service_role) — NOT exposed to
-- the Data API.
--
-- The SAME table shape is auto-created at runtime by central-bot on a customer's own
-- database when a bot opts into BYO-DB (see services/central-bot/src/lib/shop-store-db.js),
-- so the two storage modes share one query path. Keep the columns here in sync with
-- that bootstrap DDL.
-- ═════════════════════════════════════════════════════════════════════════════

CREATE SCHEMA IF NOT EXISTS shop;
GRANT USAGE ON SCHEMA shop TO service_role;


CREATE TABLE IF NOT EXISTS shop.order_counters (
    external_subject_id TEXT        NOT NULL,
    channel_id          TEXT        NOT NULL,
    order_count         INTEGER     NOT NULL DEFAULT 0,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT order_counters_pkey PRIMARY KEY (external_subject_id, channel_id)
);


-- RLS — defense in depth; service_role only (central-bot via pg).
ALTER TABLE shop.order_counters ENABLE ROW LEVEL SECURITY;
GRANT ALL ON shop.order_counters TO service_role;
CREATE POLICY order_counters_service_all ON shop.order_counters
    TO service_role USING (true) WITH CHECK (true);
