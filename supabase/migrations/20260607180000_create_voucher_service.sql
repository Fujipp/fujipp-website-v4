-- ═════════════════════════════════════════════════════════════════════════════
-- TrueMoney Voucher Service
--
-- Records TrueMoney gift-voucher redeems (top-ups) requested by the bots: which
-- phone number was topped up, how much, and the outcome. Replaces the standalone
-- NestJS/SQLite voucher service with a Java service that mirrors billing-service.
--
-- Lives in its OWN schema `voucher` (not public) to stay an isolated module.
-- Access model: the Spring voucher service reaches these tables via JDBC only.
-- This schema is NOT exposed to the Supabase Data API and grants nothing to
-- anon/authenticated. RLS is enabled as defense-in-depth; only service_role has
-- a policy. Amounts are stored in SATANG (THB ×100) as BIGINT.
--
-- Depends on: public.set_updated_at()  (from 20260528000001_create_profiles.sql)
-- ═════════════════════════════════════════════════════════════════════════════

CREATE SCHEMA IF NOT EXISTS voucher;

-- Service connects as service_role (or postgres); no anon/authenticated exposure.
GRANT USAGE ON SCHEMA voucher TO service_role;


-- ═══ REDEEM (top-up history) ═════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS voucher.redeem (
    id              UUID        NOT NULL DEFAULT gen_random_uuid(),
    client_id       TEXT        NOT NULL,            -- source bot, e.g. 'kanom-001'
    phone           TEXT        NOT NULL,            -- number that was topped up
    gift_url_hash   TEXT        NOT NULL,            -- sha256(gift_url), avoids storing the raw link
    status          TEXT        NOT NULL DEFAULT 'CREATED',
    amount_satang   BIGINT,                          -- set on success
    currency        CHAR(3)     NOT NULL DEFAULT 'THB',
    issuer          TEXT,                            -- voucher owner full name
    reference       TEXT,                            -- upstream voucher/ticket reference
    fail_code       TEXT,
    fail_reason     TEXT,
    idempotency_key TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT redeem_pkey PRIMARY KEY (id),
    CONSTRAINT redeem_status_chk CHECK (status IN
        ('CREATED','VERIFYING','VERIFY_FAILED','REDEEMING','REDEEM_FAILED','SUCCEEDED')),
    CONSTRAINT redeem_amount_pos CHECK (amount_satang IS NULL OR amount_satang >= 0)
);

-- One row per (client, idempotency_key) so a retried request is a no-op.
CREATE UNIQUE INDEX IF NOT EXISTS uq_redeem_client_idempotency
    ON voucher.redeem (client_id, idempotency_key)
    WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_redeem_phone_created
    ON voucher.redeem (phone, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_redeem_created
    ON voucher.redeem (created_at DESC);

CREATE OR REPLACE TRIGGER redeem_set_updated_at
    BEFORE UPDATE ON voucher.redeem
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ═══ PHONE SUMMARY (per-number aggregate over successful top-ups) ════════════

CREATE OR REPLACE VIEW voucher.phone_summary AS
SELECT
    phone,
    count(*)                          AS redeem_count,
    coalesce(sum(amount_satang), 0)   AS total_amount_satang,
    min(created_at)                   AS first_redeem_at,
    max(created_at)                   AS last_redeem_at
FROM voucher.redeem
WHERE status = 'SUCCEEDED'
GROUP BY phone;


-- ═══ Access: JDBC service_role only; no Data API exposure ═════════════════════

ALTER TABLE voucher.redeem ENABLE ROW LEVEL SECURITY;
GRANT ALL ON voucher.redeem TO service_role;
CREATE POLICY redeem_service_role ON voucher.redeem
    TO service_role USING (true) WITH CHECK (true);

GRANT SELECT ON voucher.phone_summary TO service_role;
