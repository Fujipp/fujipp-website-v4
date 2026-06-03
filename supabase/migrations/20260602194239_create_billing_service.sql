-- ═════════════════════════════════════════════════════════════════════════════
-- Billing / Wallet Service
--
-- A self-contained commerce module: credit wallet, feature catalog (rent + source
-- code), runtime hosting plans, orders, subscriptions, source-code delivery.
--
-- Lives in its OWN schema `billing` (not public) to stay a reusable, isolated
-- module that never collides with the main platform's public tables.
-- Identity is owned by the platform via public.profiles; every user reference is
-- a cross-schema FK to public.profiles (id UUID).
--
-- Access model: the Spring backend reaches these tables via JDBC only. This schema
-- is NOT exposed to the Supabase Data API and grants nothing to anon/authenticated.
-- RLS is enabled on every table as defense-in-depth; only service_role has a policy.
--
-- Money is stored in SATANG (THB ×100) as BIGINT. 50 THB = 5000 satang.
--
-- Depends on: public.set_updated_at()  (from 20260528000001_create_profiles.sql)
-- ═════════════════════════════════════════════════════════════════════════════

CREATE SCHEMA IF NOT EXISTS billing;

-- Backend connects as service_role (or postgres); no anon/authenticated exposure.
GRANT USAGE ON SCHEMA billing TO service_role;


-- ═══ WALLET ══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS billing.wallets (
    id             UUID        NOT NULL DEFAULT gen_random_uuid(),
    user_id        UUID        NOT NULL,
    balance_satang BIGINT      NOT NULL DEFAULT 0,
    currency       CHAR(3)     NOT NULL DEFAULT 'THB',
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT wallets_pkey         PRIMARY KEY (id),
    CONSTRAINT wallets_user_id_key  UNIQUE (user_id),
    CONSTRAINT wallets_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES public.profiles (id) ON DELETE CASCADE,
    CONSTRAINT wallets_balance_nonneg CHECK (balance_satang >= 0)
);

CREATE TABLE IF NOT EXISTS billing.wallet_transactions (
    id                   UUID        NOT NULL DEFAULT gen_random_uuid(),
    wallet_id            UUID        NOT NULL,
    user_id              UUID        NOT NULL,
    direction            TEXT        NOT NULL,
    type                 TEXT        NOT NULL,
    amount_satang        BIGINT      NOT NULL,
    balance_after_satang BIGINT      NOT NULL,
    reference_type       TEXT,                 -- 'PAYMENT' | 'ORDER' | 'SUBSCRIPTION' | 'MANUAL'
    reference_id         UUID,
    note                 TEXT,
    created_by           UUID,                 -- admin profile id for ADJUSTMENT, else NULL
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT wallet_transactions_pkey        PRIMARY KEY (id),
    CONSTRAINT wallet_transactions_wallet_fkey FOREIGN KEY (wallet_id)
        REFERENCES billing.wallets (id) ON DELETE CASCADE,
    CONSTRAINT wallet_transactions_user_fkey   FOREIGN KEY (user_id)
        REFERENCES public.profiles (id) ON DELETE CASCADE,
    CONSTRAINT wallet_transactions_direction_chk CHECK (direction IN ('CREDIT','DEBIT')),
    CONSTRAINT wallet_transactions_type_chk CHECK (type IN
        ('TOPUP','PURCHASE','RENEWAL','REFUND','UPGRADE_CREDIT','ADJUSTMENT','BONUS')),
    CONSTRAINT wallet_transactions_amount_pos CHECK (amount_satang > 0)
);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_user_created
    ON billing.wallet_transactions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_reference
    ON billing.wallet_transactions (reference_type, reference_id);


-- ═══ PAYMENTS (real money in — top-up only) ══════════════════════════════════

CREATE TABLE IF NOT EXISTS billing.payments (
    id                  UUID        NOT NULL DEFAULT gen_random_uuid(),
    user_id             UUID        NOT NULL,
    purpose             TEXT        NOT NULL DEFAULT 'WALLET_TOPUP',
    provider            TEXT        NOT NULL DEFAULT 'MANUAL',
    provider_payment_id TEXT,
    reference           TEXT,
    status              TEXT        NOT NULL DEFAULT 'PENDING',
    amount_satang       BIGINT      NOT NULL,
    currency            CHAR(3)     NOT NULL DEFAULT 'THB',
    qr_code_url         TEXT,
    expires_at          TIMESTAMPTZ,
    paid_at             TIMESTAMPTZ,
    failure_message     TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT payments_pkey                    PRIMARY KEY (id),
    CONSTRAINT payments_provider_payment_id_key UNIQUE (provider_payment_id),
    CONSTRAINT payments_reference_key           UNIQUE (reference),
    CONSTRAINT payments_user_fkey FOREIGN KEY (user_id)
        REFERENCES public.profiles (id) ON DELETE CASCADE,
    CONSTRAINT payments_status_chk CHECK (status IN ('PENDING','PAID','FAILED','EXPIRED','REFUNDED')),
    -- minimum top-up 50 THB = 5000 satang
    CONSTRAINT payments_amount_min CHECK (amount_satang >= 5000)
);
CREATE INDEX IF NOT EXISTS idx_payments_user ON billing.payments (user_id, created_at DESC);


-- ═══ CATALOG ═════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS billing.feature_catalog (
    id                     UUID        NOT NULL DEFAULT gen_random_uuid(),
    code                   TEXT        NOT NULL,
    name                   TEXT        NOT NULL,
    description            TEXT        NOT NULL DEFAULT '',
    category               TEXT        NOT NULL,
    current_source_version TEXT,
    is_featured            BOOLEAN     NOT NULL DEFAULT FALSE,
    sort_order             INTEGER     NOT NULL DEFAULT 100,
    is_active              BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT feature_catalog_pkey     PRIMARY KEY (id),
    CONSTRAINT feature_catalog_code_key UNIQUE (code),
    CONSTRAINT feature_catalog_category_chk CHECK (category IN
        ('SHOP','PAYMENT','ROBLOX','ENGAGEMENT','RUNTIME','ADMIN','AUTOMATION','SUPPORT'))
);

-- One feature can have several priced SKUs: cheap rent, mid permanent, pricey source.
CREATE TABLE IF NOT EXISTS billing.feature_prices (
    id                     UUID        NOT NULL DEFAULT gen_random_uuid(),
    feature_id             UUID        NOT NULL,
    kind                   TEXT        NOT NULL,
    price_satang           BIGINT      NOT NULL,
    currency               CHAR(3)     NOT NULL DEFAULT 'THB',
    duration_months        INTEGER,
    promotion_label        TEXT,
    promotion_price_satang BIGINT,                     -- fixed promo price (not percentage)
    promotion_starts_at    TIMESTAMPTZ,
    promotion_ends_at      TIMESTAMPTZ,
    is_active              BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT feature_prices_pkey             PRIMARY KEY (id),
    CONSTRAINT feature_prices_feature_kind_key UNIQUE (feature_id, kind),
    CONSTRAINT feature_prices_feature_fkey FOREIGN KEY (feature_id)
        REFERENCES billing.feature_catalog (id) ON DELETE CASCADE,
    CONSTRAINT feature_prices_kind_chk CHECK (kind IN ('RENT_MONTHLY','RENT_PERMANENT','SOURCE_CODE')),
    CONSTRAINT feature_prices_price_nonneg CHECK (price_satang >= 0)
);
CREATE INDEX IF NOT EXISTS idx_feature_prices_feature ON billing.feature_prices (feature_id);

-- Runtime hosting packages (stack/extend on purchase).
CREATE TABLE IF NOT EXISTS billing.runtime_plans (
    id                     UUID        NOT NULL DEFAULT gen_random_uuid(),
    code                   TEXT        NOT NULL,
    name                   TEXT        NOT NULL,
    duration_months        INTEGER     NOT NULL,
    price_satang           BIGINT      NOT NULL,
    currency               CHAR(3)     NOT NULL DEFAULT 'THB',
    promotion_label        TEXT,
    promotion_price_satang BIGINT,
    promotion_starts_at    TIMESTAMPTZ,
    promotion_ends_at      TIMESTAMPTZ,
    is_featured            BOOLEAN     NOT NULL DEFAULT FALSE,
    sort_order             INTEGER     NOT NULL DEFAULT 100,
    is_active              BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT runtime_plans_pkey     PRIMARY KEY (id),
    CONSTRAINT runtime_plans_code_key UNIQUE (code),
    CONSTRAINT runtime_plans_price_nonneg CHECK (price_satang >= 0)
);

-- Config schema each feature asks the customer to fill in.
CREATE TABLE IF NOT EXISTS billing.feature_variable_templates (
    id            UUID        NOT NULL DEFAULT gen_random_uuid(),
    feature_id    UUID        NOT NULL,
    variable_key  TEXT        NOT NULL,
    label         TEXT        NOT NULL,
    description   TEXT,
    value_type    TEXT        NOT NULL DEFAULT 'STRING',
    is_required   BOOLEAN     NOT NULL DEFAULT FALSE,
    is_sensitive  BOOLEAN     NOT NULL DEFAULT FALSE,
    default_value TEXT,
    sort_order    INTEGER     NOT NULL DEFAULT 100,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT feature_variable_templates_pkey    PRIMARY KEY (id),
    CONSTRAINT feature_variable_templates_key     UNIQUE (feature_id, variable_key),
    CONSTRAINT feature_variable_templates_feature_fkey FOREIGN KEY (feature_id)
        REFERENCES billing.feature_catalog (id) ON DELETE CASCADE,
    CONSTRAINT feature_variable_templates_type_chk CHECK (value_type IN
        ('STRING','TEXT','NUMBER','BOOLEAN','CHANNEL_ID','ROLE_ID','USER_ID','SECRET','JSON'))
);


-- ═══ ENTITLEMENTS ════════════════════════════════════════════════════════════

-- Rented features.
--   scope = BOT      → tied to one external_subject_id (per-bot, paid each).
--   scope = ACCOUNT  → external_subject_id NULL, valid for ALL the user's subjects
--                      (this is how RENT_PERMANENT works).
CREATE TABLE IF NOT EXISTS billing.feature_subscriptions (
    id                   UUID        NOT NULL DEFAULT gen_random_uuid(),
    user_id              UUID        NOT NULL,
    feature_id           UUID        NOT NULL,
    price_id             UUID,
    scope                TEXT        NOT NULL DEFAULT 'BOT',
    external_subject_id  TEXT,
    billing_type         TEXT        NOT NULL DEFAULT 'RENT_MONTHLY',
    status               TEXT        NOT NULL DEFAULT 'ACTIVE',
    current_period_start DATE        NOT NULL DEFAULT CURRENT_DATE,
    current_period_end   DATE,
    auto_renew           BOOLEAN     NOT NULL DEFAULT TRUE,
    renew_price_satang   BIGINT,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT feature_subscriptions_pkey         PRIMARY KEY (id),
    CONSTRAINT feature_subscriptions_user_fkey    FOREIGN KEY (user_id)
        REFERENCES public.profiles (id) ON DELETE CASCADE,
    CONSTRAINT feature_subscriptions_feature_fkey FOREIGN KEY (feature_id)
        REFERENCES billing.feature_catalog (id) ON DELETE RESTRICT,
    CONSTRAINT feature_subscriptions_price_fkey   FOREIGN KEY (price_id)
        REFERENCES billing.feature_prices (id) ON DELETE SET NULL,
    CONSTRAINT feature_subscriptions_scope_chk    CHECK (scope IN ('BOT','ACCOUNT')),
    CONSTRAINT feature_subscriptions_billing_chk  CHECK (billing_type IN ('RENT_MONTHLY','RENT_PERMANENT')),
    CONSTRAINT feature_subscriptions_status_chk   CHECK (status IN ('ACTIVE','PAST_DUE','SUSPENDED','CANCELED')),
    CONSTRAINT feature_subscriptions_scope_subject_chk CHECK (
        (scope = 'BOT'     AND external_subject_id IS NOT NULL) OR
        (scope = 'ACCOUNT' AND external_subject_id IS NULL)
    )
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_feature_sub_bot
    ON billing.feature_subscriptions (feature_id, external_subject_id)
    WHERE scope = 'BOT';
CREATE UNIQUE INDEX IF NOT EXISTS uq_feature_sub_account
    ON billing.feature_subscriptions (user_id, feature_id)
    WHERE scope = 'ACCOUNT';
CREATE INDEX IF NOT EXISTS idx_feature_sub_user ON billing.feature_subscriptions (user_id);
CREATE INDEX IF NOT EXISTS idx_feature_sub_renew
    ON billing.feature_subscriptions (status, auto_renew, current_period_end);

-- Runtime hosting subscription (one per subject/bot).
CREATE TABLE IF NOT EXISTS billing.runtime_subscriptions (
    id                   UUID        NOT NULL DEFAULT gen_random_uuid(),
    user_id              UUID        NOT NULL,
    external_subject_id  TEXT        NOT NULL,
    runtime_plan_id      UUID,
    status               TEXT        NOT NULL DEFAULT 'ACTIVE',
    current_period_start DATE        NOT NULL DEFAULT CURRENT_DATE,
    current_period_end   DATE        NOT NULL,
    auto_renew           BOOLEAN     NOT NULL DEFAULT TRUE,
    renew_plan_id        UUID,
    renew_price_satang   BIGINT,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT runtime_subscriptions_pkey        PRIMARY KEY (id),
    CONSTRAINT runtime_subscriptions_subject_key UNIQUE (external_subject_id),
    CONSTRAINT runtime_subscriptions_user_fkey   FOREIGN KEY (user_id)
        REFERENCES public.profiles (id) ON DELETE CASCADE,
    CONSTRAINT runtime_subscriptions_plan_fkey   FOREIGN KEY (runtime_plan_id)
        REFERENCES billing.runtime_plans (id) ON DELETE SET NULL,
    CONSTRAINT runtime_subscriptions_status_chk  CHECK (status IN ('ACTIVE','PAST_DUE','SUSPENDED','CANCELED'))
);
CREATE INDEX IF NOT EXISTS idx_runtime_sub_user ON billing.runtime_subscriptions (user_id);
CREATE INDEX IF NOT EXISTS idx_runtime_sub_renew
    ON billing.runtime_subscriptions (status, auto_renew, current_period_end);

-- Source-code ownership (one-time purchase, tied to the user, not a subject).
CREATE TABLE IF NOT EXISTS billing.source_code_entitlements (
    id                  UUID        NOT NULL DEFAULT gen_random_uuid(),
    user_id             UUID        NOT NULL,
    feature_id          UUID        NOT NULL,
    price_id            UUID,
    purchased_version   TEXT,
    license_key         TEXT        NOT NULL,
    status              TEXT        NOT NULL DEFAULT 'PENDING',
    download_url        TEXT,
    download_expires_at TIMESTAMPTZ,
    download_count      INTEGER     NOT NULL DEFAULT 0,
    max_downloads       INTEGER,
    purchased_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT source_code_entitlements_pkey            PRIMARY KEY (id),
    CONSTRAINT source_code_entitlements_license_key_key UNIQUE (license_key),
    CONSTRAINT source_code_entitlements_user_feature_key UNIQUE (user_id, feature_id),
    CONSTRAINT source_code_entitlements_user_fkey    FOREIGN KEY (user_id)
        REFERENCES public.profiles (id) ON DELETE CASCADE,
    CONSTRAINT source_code_entitlements_feature_fkey FOREIGN KEY (feature_id)
        REFERENCES billing.feature_catalog (id) ON DELETE RESTRICT,
    CONSTRAINT source_code_entitlements_status_chk    CHECK (status IN ('PENDING','READY','REVOKED'))
);
CREATE INDEX IF NOT EXISTS idx_source_ent_user ON billing.source_code_entitlements (user_id);

-- Each downloadable source release/version. Owners always pull the latest (free updates).
CREATE TABLE IF NOT EXISTS billing.source_code_releases (
    id              UUID        NOT NULL DEFAULT gen_random_uuid(),
    feature_id      UUID        NOT NULL,
    version         TEXT        NOT NULL,
    changelog       TEXT,
    file_url        TEXT        NOT NULL,
    file_size_bytes BIGINT,
    is_latest       BOOLEAN     NOT NULL DEFAULT FALSE,
    released_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT source_code_releases_pkey             PRIMARY KEY (id),
    CONSTRAINT source_code_releases_feature_ver_key  UNIQUE (feature_id, version),
    CONSTRAINT source_code_releases_feature_fkey FOREIGN KEY (feature_id)
        REFERENCES billing.feature_catalog (id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_source_releases_feature ON billing.source_code_releases (feature_id);


-- ═══ CONFIG VALUES (bridge to the bot runtime) ═══════════════════════════════

CREATE TABLE IF NOT EXISTS billing.feature_config_values (
    id                  UUID        NOT NULL DEFAULT gen_random_uuid(),
    user_id             UUID        NOT NULL,
    external_subject_id TEXT        NOT NULL,
    feature_id          UUID        NOT NULL,
    config_key          TEXT        NOT NULL,
    config_value        TEXT,
    is_secret           BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT feature_config_values_pkey PRIMARY KEY (id),
    CONSTRAINT feature_config_values_key  UNIQUE (external_subject_id, feature_id, config_key),
    CONSTRAINT feature_config_values_user_fkey    FOREIGN KEY (user_id)
        REFERENCES public.profiles (id) ON DELETE CASCADE,
    CONSTRAINT feature_config_values_feature_fkey FOREIGN KEY (feature_id)
        REFERENCES billing.feature_catalog (id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_feature_config_subject
    ON billing.feature_config_values (external_subject_id, feature_id);


-- ═══ ORDERS (credit spend receipts) ══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS billing.credit_orders (
    id              UUID        NOT NULL DEFAULT gen_random_uuid(),
    user_id         UUID        NOT NULL,
    status          TEXT        NOT NULL DEFAULT 'PENDING',
    total_satang    BIGINT      NOT NULL DEFAULT 0,
    currency        CHAR(3)     NOT NULL DEFAULT 'THB',
    idempotency_key TEXT,
    note            TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT credit_orders_pkey            PRIMARY KEY (id),
    CONSTRAINT credit_orders_idempotency_key UNIQUE (idempotency_key),
    CONSTRAINT credit_orders_user_fkey FOREIGN KEY (user_id)
        REFERENCES public.profiles (id) ON DELETE CASCADE,
    CONSTRAINT credit_orders_status_chk CHECK (status IN ('PENDING','PAID','REFUNDED','FAILED'))
);
CREATE INDEX IF NOT EXISTS idx_credit_orders_user ON billing.credit_orders (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS billing.credit_order_items (
    id                       UUID        NOT NULL DEFAULT gen_random_uuid(),
    order_id                 UUID        NOT NULL,
    kind                     TEXT        NOT NULL,
    feature_id               UUID,
    runtime_plan_id          UUID,
    price_id                 UUID,
    external_subject_id      TEXT,
    amount_satang            BIGINT      NOT NULL,
    item_code                TEXT        NOT NULL,
    item_name                TEXT        NOT NULL,
    replaces_subscription_id UUID,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT credit_order_items_pkey       PRIMARY KEY (id),
    CONSTRAINT credit_order_items_order_fkey FOREIGN KEY (order_id)
        REFERENCES billing.credit_orders (id) ON DELETE CASCADE,
    CONSTRAINT credit_order_items_kind_chk CHECK (kind IN
        ('RENT_MONTHLY','RENT_PERMANENT','SOURCE_CODE','RUNTIME','UPGRADE'))
);
CREATE INDEX IF NOT EXISTS idx_credit_order_items_order ON billing.credit_order_items (order_id);


-- ═══ OPS: notifications & automation ═════════════════════════════════════════

CREATE TABLE IF NOT EXISTS billing.customer_notifications (
    id                  UUID        NOT NULL DEFAULT gen_random_uuid(),
    user_id             UUID        NOT NULL,
    external_subject_id TEXT,
    type                TEXT        NOT NULL,
    title               TEXT        NOT NULL,
    message             TEXT        NOT NULL,
    is_read             BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT customer_notifications_pkey PRIMARY KEY (id),
    CONSTRAINT customer_notifications_user_fkey FOREIGN KEY (user_id)
        REFERENCES public.profiles (id) ON DELETE CASCADE,
    CONSTRAINT customer_notifications_type_chk CHECK (type IN
        ('TOPUP_SUCCESS','WALLET_LOW','RENEWAL_SUCCESS','RENEWAL_FAILED',
         'RUNTIME_SUSPENDED','FEATURE_CANCELED','SOURCE_UPDATE_AVAILABLE'))
);
CREATE INDEX IF NOT EXISTS idx_notifications_user
    ON billing.customer_notifications (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS billing.automation_settings (
    setting_key   TEXT        NOT NULL,
    setting_value TEXT        NOT NULL,
    description   TEXT,
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT automation_settings_pkey PRIMARY KEY (setting_key)
);

CREATE TABLE IF NOT EXISTS billing.automation_runs (
    id                    UUID        NOT NULL DEFAULT gen_random_uuid(),
    run_type              TEXT        NOT NULL,
    status                TEXT        NOT NULL DEFAULT 'RUNNING',
    renewals_charged      INTEGER     NOT NULL DEFAULT 0,
    marked_past_due       INTEGER     NOT NULL DEFAULT 0,
    feature_canceled      INTEGER     NOT NULL DEFAULT 0,
    runtime_suspended     INTEGER     NOT NULL DEFAULT 0,
    notifications_created INTEGER     NOT NULL DEFAULT 0,
    error_message         TEXT,
    started_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at           TIMESTAMPTZ,
    CONSTRAINT automation_runs_pkey PRIMARY KEY (id),
    CONSTRAINT automation_runs_status_chk CHECK (status IN ('RUNNING','SUCCESS','FAILED'))
);
CREATE INDEX IF NOT EXISTS idx_automation_runs_started ON billing.automation_runs (started_at DESC);


-- ═════════════════════════════════════════════════════════════════════════════
-- updated_at triggers (reuse public.set_updated_at())
-- ═════════════════════════════════════════════════════════════════════════════
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'wallets','payments','feature_catalog','feature_prices','runtime_plans',
    'feature_variable_templates','feature_subscriptions','runtime_subscriptions',
    'source_code_entitlements','feature_config_values','credit_orders'
  ] LOOP
    EXECUTE format(
      'CREATE OR REPLACE TRIGGER %I_set_updated_at BEFORE UPDATE ON billing.%I
         FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();', t, t);
  END LOOP;
END $$;


-- ═════════════════════════════════════════════════════════════════════════════
-- Row Level Security — defense in depth.
-- Schema is NOT exposed to the Data API; only service_role (backend JDBC) gets in.
-- ═════════════════════════════════════════════════════════════════════════════
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'wallets','wallet_transactions','payments','feature_catalog','feature_prices',
    'runtime_plans','feature_variable_templates','feature_subscriptions',
    'runtime_subscriptions','source_code_entitlements','source_code_releases',
    'feature_config_values','credit_orders','credit_order_items',
    'customer_notifications','automation_settings','automation_runs'
  ] LOOP
    EXECUTE format('ALTER TABLE billing.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('GRANT ALL ON billing.%I TO service_role;', t);
    EXECUTE format(
      'CREATE POLICY %I ON billing.%I TO service_role USING (true) WITH CHECK (true);',
      t || '_service_all', t);
  END LOOP;
END $$;


-- ═════════════════════════════════════════════════════════════════════════════
-- Reference data required in every environment (prod included)
-- ═════════════════════════════════════════════════════════════════════════════

INSERT INTO billing.automation_settings (setting_key, setting_value, description) VALUES
  ('automation.enabled',                'true',  'Run daily billing/runtime automation at 09:00 Asia/Bangkok'),
  ('automation.reminder_days_before',   '3',     'Days before period end to send a renewal reminder'),
  ('automation.past_due_grace_days',    '1',     'Days after period end before ACTIVE becomes PAST_DUE'),
  ('automation.cancel_grace_days',      '7',     'Days after period end before PAST_DUE feature subs are CANCELED'),
  ('automation.runtime_suspend_enabled','false', 'Suspend bot features when runtime expires — enable after billing is verified'),
  ('topup.min_satang',                  '5000',  'Minimum top-up amount (50 THB)')
ON CONFLICT (setting_key) DO UPDATE SET description = EXCLUDED.description;

-- Runtime hosting plans (69 / 130 / 199 THB)
INSERT INTO billing.runtime_plans (code, name, duration_months, price_satang, promotion_label, sort_order, is_featured)
VALUES
  ('runtime-1m', 'Runtime 24/7 — 1 เดือน', 1,  6900, NULL,          10, TRUE),
  ('runtime-2m', 'Runtime 24/7 — 2 เดือน', 2, 13000, 'คุ้มกว่า',    20, FALSE),
  ('runtime-3m', 'Runtime 24/7 — 3 เดือน', 3, 19900, 'คุ้มที่สุด',  30, FALSE)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name, duration_months = EXCLUDED.duration_months,
  price_satang = EXCLUDED.price_satang, promotion_label = EXCLUDED.promotion_label;
