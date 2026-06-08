-- ═════════════════════════════════════════════════════════════════════════════
-- Shop Wallet (layer B)
--
-- The in-bot wallet of the CUSTOMER's Discord members — separate from the platform
-- billing wallet (how a SaaS customer pays Fujipp). Scoped by external_subject_id
-- (the bot) + member_discord_id. The wallet-topup feature fills it; Roblox redeem
-- debits it. Money is SATANG (THB ×100) as BIGINT.
--
-- Accessed only by central-bot (Node, service_role) — NOT exposed to the Data API.
-- Members are Discord users (not public.profiles), so there is no platform FK.
-- ═════════════════════════════════════════════════════════════════════════════

CREATE SCHEMA IF NOT EXISTS shop;
GRANT USAGE ON SCHEMA shop TO service_role;


CREATE TABLE IF NOT EXISTS shop.member_wallets (
    id                  UUID        NOT NULL DEFAULT gen_random_uuid(),
    external_subject_id TEXT        NOT NULL,
    member_discord_id   TEXT        NOT NULL,
    balance_satang      BIGINT      NOT NULL DEFAULT 0,
    currency            CHAR(3)     NOT NULL DEFAULT 'THB',
    total_topup_satang  BIGINT      NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT member_wallets_pkey       PRIMARY KEY (id),
    CONSTRAINT member_wallets_subject_member_key UNIQUE (external_subject_id, member_discord_id),
    CONSTRAINT member_wallets_balance_nonneg CHECK (balance_satang >= 0)
);
CREATE INDEX IF NOT EXISTS idx_member_wallets_subject ON shop.member_wallets (external_subject_id);


CREATE TABLE IF NOT EXISTS shop.wallet_ledger (
    id                   UUID        NOT NULL DEFAULT gen_random_uuid(),
    external_subject_id  TEXT        NOT NULL,
    member_discord_id    TEXT        NOT NULL,
    direction            TEXT        NOT NULL,
    type                 TEXT        NOT NULL,
    amount_satang        BIGINT      NOT NULL,
    balance_after_satang BIGINT      NOT NULL,
    reference            TEXT,
    note                 TEXT,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT wallet_ledger_pkey PRIMARY KEY (id),
    CONSTRAINT wallet_ledger_direction_chk CHECK (direction IN ('CREDIT','DEBIT')),
    CONSTRAINT wallet_ledger_type_chk CHECK (type IN ('TOPUP','ROBUX_REDEEM','ADJUSTMENT','REFUND')),
    CONSTRAINT wallet_ledger_amount_pos CHECK (amount_satang > 0)
);
CREATE INDEX IF NOT EXISTS idx_wallet_ledger_member
    ON shop.wallet_ledger (external_subject_id, member_discord_id, created_at DESC);


CREATE OR REPLACE TRIGGER member_wallets_set_updated_at
    BEFORE UPDATE ON shop.member_wallets
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- RLS — defense in depth; service_role only (central-bot via JDBC/pg).
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['member_wallets','wallet_ledger'] LOOP
    EXECUTE format('ALTER TABLE shop.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('GRANT ALL ON shop.%I TO service_role;', t);
    EXECUTE format(
      'CREATE POLICY %I ON shop.%I TO service_role USING (true) WITH CHECK (true);',
      t || '_service_all', t);
  END LOOP;
END $$;
