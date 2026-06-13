-- ═════════════════════════════════════════════════════════════════════════════
-- Admin audit log
--
-- Append-only trail of privileged operator actions: catalog price edits,
-- per-subscription renewal-price overrides, wallet adjustments, user/role edits,
-- and bot config/placement changes.
--
-- Lives in the `billing` schema alongside the rest of the commerce module (which
-- is where most audited actions originate). Written by billing-service directly;
-- the main backend records its few pure-platform actions (e.g. role changes) via
-- the billing-service HTTP API, consistent with how it reaches all billing data.
--
-- Access model matches the billing schema: NOT exposed to the Supabase Data API,
-- RLS enabled as defense-in-depth, only service_role gets a policy.
--
-- actor_id / target_user_id are nullable FKs to public.profiles with ON DELETE
-- SET NULL so an audit row always survives even if the referenced profile is
-- later removed.
-- ═════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS billing.admin_audit_log (
    id             UUID        NOT NULL DEFAULT gen_random_uuid(),
    actor_id       UUID,                 -- admin profile that performed the action
    action         TEXT        NOT NULL, -- e.g. CATALOG_PRICE_UPDATE, WALLET_ADJUST, USER_ROLE_UPDATE
    target_user_id UUID,                 -- affected user, when the action targets one
    target_type    TEXT,                 -- RUNTIME_PLAN | FEATURE_PRICE | RUNTIME_SUBSCRIPTION | FEATURE_SUBSCRIPTION | WALLET | PROFILE | BOT
    target_id      TEXT,                 -- uuid or external subject id of the target (TEXT for flexibility)
    payload        JSONB,                -- before/after diff or action detail
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT admin_audit_log_pkey PRIMARY KEY (id),
    CONSTRAINT admin_audit_log_actor_fkey FOREIGN KEY (actor_id)
        REFERENCES public.profiles (id) ON DELETE SET NULL,
    CONSTRAINT admin_audit_log_target_user_fkey FOREIGN KEY (target_user_id)
        REFERENCES public.profiles (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_actor_created
    ON billing.admin_audit_log (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_target_user_created
    ON billing.admin_audit_log (target_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_created
    ON billing.admin_audit_log (created_at DESC);

-- RLS — defense in depth (schema is not exposed to the Data API; backend reaches
-- it as service_role over JDBC).
ALTER TABLE billing.admin_audit_log ENABLE ROW LEVEL SECURITY;
GRANT ALL ON billing.admin_audit_log TO service_role;
CREATE POLICY admin_audit_log_service_all ON billing.admin_audit_log
    TO service_role USING (true) WITH CHECK (true);
