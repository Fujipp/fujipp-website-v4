-- ═════════════════════════════════════════════════════════════════════════════
-- VPS Nodes (bot host registry) + slot accounting
--
-- A "slot" is a seat for one bot on a physical VPS. The platform runs the bots
-- on one VPS today, but is built to scale horizontally: each VPS runs its OWN
-- bot-runtime-service (orchestrator) on its local PM2, and the BACKEND decides
-- which VPS a bot lives on. That placement is recorded here.
--
--   bots.vps_nodes        — one row per VPS host (capacity = max_slots)
--   bot_instances.vps_node_id — which host a bot is placed on (a consumed slot)
--
-- Slot usage of a node = COUNT(bot_instances WHERE vps_node_id = node). Placement
-- (assigning vps_node_id) happens at purchase time and is checked against max_slots
-- under a row lock on the node, so two buyers can't oversubscribe the same host.
--
-- orchestrator_url / service_token_cipher are OPTIONAL: a NULL means "use the
-- backend's default runtime.base-url / runtime.service-token from env". The
-- primary (current) VPS uses that fallback, so no secret is stored in the DB.
-- Future VPSes set their own url + encrypted token (same AES-256-GCM envelope as
-- bot tokens — see 20260605171000 header).
--
-- status:
--   ACTIVE   — accepts new placements
--   DRAINING — keeps running existing bots, refuses new placements (for migration)
--   OFFLINE  — not reachable; excluded from placement
--
-- Access model: backend / orchestrator reach this via JDBC as service_role only.
-- Schema is NOT exposed to the Supabase Data API; RLS is defense-in-depth.
--
-- Depends on: public.set_updated_at(), bots.bot_instances (20260605171000)
-- ═════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS bots.vps_nodes (
    id                   UUID        NOT NULL DEFAULT gen_random_uuid(),
    name                 TEXT        NOT NULL,            -- stable slug, e.g. 'vps-primary'
    label                TEXT,                            -- display name, e.g. 'Primary (shared)'
    region               TEXT,                            -- e.g. 'th'
    orchestrator_url     TEXT,                            -- backend reaches this host here; NULL → env default
    service_token_cipher TEXT,                            -- AES-256-GCM X-Service-Token; NULL → env default
    max_slots            INTEGER     NOT NULL DEFAULT 0,
    status               TEXT        NOT NULL DEFAULT 'ACTIVE',
    notes                TEXT,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT vps_nodes_pkey         PRIMARY KEY (id),
    CONSTRAINT vps_nodes_name_key     UNIQUE (name),
    CONSTRAINT vps_nodes_max_slots_chk CHECK (max_slots >= 0),
    CONSTRAINT vps_nodes_status_chk   CHECK (status IN ('ACTIVE', 'DRAINING', 'OFFLINE'))
);

CREATE INDEX IF NOT EXISTS idx_vps_nodes_status ON bots.vps_nodes (status);


-- updated_at trigger (reuse public.set_updated_at())
CREATE OR REPLACE TRIGGER vps_nodes_set_updated_at
    BEFORE UPDATE ON bots.vps_nodes
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- Each bot is placed on exactly one node (NULL = not yet placed / no runtime).
-- RESTRICT: a node that still hosts bots cannot be deleted out from under them.
ALTER TABLE bots.bot_instances
    ADD COLUMN IF NOT EXISTS vps_node_id UUID;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'bot_instances_vps_node_fkey'
    ) THEN
        ALTER TABLE bots.bot_instances
            ADD CONSTRAINT bot_instances_vps_node_fkey FOREIGN KEY (vps_node_id)
                REFERENCES bots.vps_nodes (id) ON DELETE RESTRICT;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_bot_instances_vps_node ON bots.bot_instances (vps_node_id);


-- ═════════════════════════════════════════════════════════════════════════════
-- Row Level Security — defense in depth. Schema is NOT exposed to the Data API;
-- only service_role (backend / orchestrator JDBC) gets in.
-- ═════════════════════════════════════════════════════════════════════════════
ALTER TABLE bots.vps_nodes ENABLE ROW LEVEL SECURITY;
GRANT ALL ON bots.vps_nodes TO service_role;

DROP POLICY IF EXISTS vps_nodes_service_all ON bots.vps_nodes;
CREATE POLICY vps_nodes_service_all ON bots.vps_nodes
    TO service_role USING (true) WITH CHECK (true);


-- ═════════════════════════════════════════════════════════════════════════════
-- Seed the current VPS. It is shared with the Java backend + billing-service, so
-- keep its slot count conservative (4 GB box: ~5 bots after reserving RAM for the
-- two JVMs + headroom). url/token NULL → backend uses its env runtime.* defaults.
-- Bump max_slots later once real RAM usage is measured.
-- ═════════════════════════════════════════════════════════════════════════════
INSERT INTO bots.vps_nodes (name, label, region, max_slots, status, notes)
VALUES ('vps-primary', 'Primary (shared)', 'th', 5, 'ACTIVE',
        'Shared with backend + billing-service. Uses default orchestrator url/token from env.')
ON CONFLICT (name) DO NOTHING;
