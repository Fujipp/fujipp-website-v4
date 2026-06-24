-- ═════════════════════════════════════════════════════════════════════════════
-- Shop Member Spending (layer B) — MANUAL spend tracker per member.
--
-- Backs the member-spending feature (port of legacy discord-bot-002-idaxdshop
-- /topup): an admin manually records how much a member has spent; the bot posts a
-- "บัตรสมาชิกร้านไอด้า" membership card, grants tier roles, and keeps Top1/Top5 reward
-- roles. This is NOT the automated wallet (shop.member_wallets) — there is no payment
-- flow; amounts are admin-entered. Scoped by external_subject_id (the bot) +
-- member_discord_id. Money is SATANG (THB ×100) as BIGINT, consistent with the wallet.
--
-- Accessed only by central-bot (Node, service_role) — NOT exposed to the Data API. The
-- SAME shape is auto-created at runtime on a customer's own database when a bot opts
-- into BYO-DB (services/central-bot/src/lib/shop-store-db.js); keep the columns in sync.
-- ═════════════════════════════════════════════════════════════════════════════

CREATE SCHEMA IF NOT EXISTS shop;
GRANT USAGE ON SCHEMA shop TO service_role;


CREATE TABLE IF NOT EXISTS shop.member_spending (
    external_subject_id TEXT        NOT NULL,
    member_discord_id   TEXT        NOT NULL,
    amount_satang       BIGINT      NOT NULL DEFAULT 0,
    tx_count            INTEGER     NOT NULL DEFAULT 0,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT member_spending_pkey PRIMARY KEY (external_subject_id, member_discord_id),
    CONSTRAINT member_spending_amount_nonneg CHECK (amount_satang >= 0),
    CONSTRAINT member_spending_count_nonneg  CHECK (tx_count >= 0)
);
CREATE INDEX IF NOT EXISTS idx_member_spending_rank
    ON shop.member_spending (external_subject_id, amount_satang DESC);


-- RLS — defense in depth; service_role only (central-bot via pg).
ALTER TABLE shop.member_spending ENABLE ROW LEVEL SECURITY;
GRANT ALL ON shop.member_spending TO service_role;
CREATE POLICY member_spending_service_all ON shop.member_spending
    TO service_role USING (true) WITH CHECK (true);
