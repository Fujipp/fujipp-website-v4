-- Persistent recovery state for central-bot money flows and temporary Discord roles.
-- Private `shop` tables are only available to the service role; no Data API access.

ALTER TABLE shop.wallet_ledger
    DROP CONSTRAINT IF EXISTS wallet_ledger_type_chk;
ALTER TABLE shop.wallet_ledger
    ADD CONSTRAINT wallet_ledger_type_chk
    CHECK (type IN ('TOPUP','ROBUX_REDEEM','APP_PREMIUM','ADJUSTMENT','REFUND'));

CREATE UNIQUE INDEX IF NOT EXISTS uq_wallet_ledger_refund_reference
    ON shop.wallet_ledger (external_subject_id, reference)
    WHERE direction = 'CREDIT' AND type = 'REFUND' AND reference IS NOT NULL;

CREATE TABLE IF NOT EXISTS shop.bot_financial_jobs (
    id                  UUID        NOT NULL DEFAULT gen_random_uuid(),
    external_subject_id TEXT        NOT NULL,
    kind                TEXT        NOT NULL,
    member_discord_id   TEXT        NOT NULL,
    status              TEXT        NOT NULL DEFAULT 'CREATED',
    amount_satang       BIGINT      NOT NULL,
    payload             JSONB       NOT NULL DEFAULT '{}'::jsonb,
    result              JSONB,
    error_message       TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at        TIMESTAMPTZ,
    CONSTRAINT bot_financial_jobs_pkey PRIMARY KEY (id),
    CONSTRAINT bot_financial_jobs_kind_chk
        CHECK (kind IN ('ROBUX_PAYOUT','APP_PREMIUM')),
    CONSTRAINT bot_financial_jobs_status_chk
        CHECK (status IN ('CREATED','DEBITED','PROCESSING','SUCCEEDED','FAILED','REFUNDED','REVIEW_REQUIRED')),
    CONSTRAINT bot_financial_jobs_amount_pos CHECK (amount_satang > 0)
);
CREATE INDEX IF NOT EXISTS idx_bot_financial_jobs_recovery
    ON shop.bot_financial_jobs (external_subject_id, kind, status, created_at);

CREATE TABLE IF NOT EXISTS shop.temporary_role_grants (
    external_subject_id TEXT        NOT NULL,
    guild_discord_id    TEXT        NOT NULL,
    member_discord_id   TEXT        NOT NULL,
    role_discord_id     TEXT        NOT NULL,
    expires_at          TIMESTAMPTZ NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT temporary_role_grants_pkey
        PRIMARY KEY (external_subject_id, guild_discord_id, member_discord_id, role_discord_id)
);
CREATE INDEX IF NOT EXISTS idx_temporary_role_grants_expiry
    ON shop.temporary_role_grants (external_subject_id, expires_at);

CREATE OR REPLACE TRIGGER bot_financial_jobs_set_updated_at
    BEFORE UPDATE ON shop.bot_financial_jobs
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE OR REPLACE TRIGGER temporary_role_grants_set_updated_at
    BEFORE UPDATE ON shop.temporary_role_grants
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['bot_financial_jobs','temporary_role_grants'] LOOP
    EXECUTE format('ALTER TABLE shop.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('GRANT ALL ON shop.%I TO service_role;', t);
    EXECUTE format(
      'CREATE POLICY %I ON shop.%I TO service_role USING (true) WITH CHECK (true);',
      t || '_service_all', t);
  END LOOP;
END $$;
