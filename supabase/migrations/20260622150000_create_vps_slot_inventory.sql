-- ═════════════════════════════════════════════════════════════════════════════
-- VPS slot inventory — explicit seats, reserved + maintenance support
--
-- Until now a "slot" was IMPLICIT: usage of a node = COUNT(bot_instances on it).
-- That cannot express the product we want:
--   • the "ตู้ VPS" UI needs real, addressable seats (a grid of slots with status)
--   • admins must RESERVE some seats for the backend/services (e.g. 12 total, keep 6)
--   • admins must put a single seat into MAINTENANCE without touching the others
--
-- So we make slots concrete. One row in bots.vps_slots = one seat on a node.
--
--   status:
--     FREE        — open seat; sellable when no ACTIVE runtime points at it
--     RESERVED    — kept for backend/services, never sold
--     MAINTENANCE — temporarily unusable
--
-- OCCUPANCY IS DERIVED, not stored here: a seat is "in use" when an ACTIVE
-- billing.runtime_subscriptions row has vps_slot_id = this slot (wired in
-- 20260622150200). Keeping a single source of truth avoids dual-write drift.
--
-- reserved_slots on bots.vps_nodes records the admin's reservation intent and
-- drives how many seats are seeded as RESERVED below.
--
-- Access model: backend / orchestrator reach this via JDBC as service_role only.
-- Schema is NOT exposed to the Supabase Data API; RLS is defense-in-depth.
--
-- Backend impact: ADDITIVE only. No existing entity maps vps_slots or
-- reserved_slots yet, so ddl-auto=validate stays green until the wiring phase
-- introduces the entities.
--
-- Depends on: public.set_updated_at(), bots.vps_nodes (20260609100000)
-- ═════════════════════════════════════════════════════════════════════════════

-- How many of a node's seats are held back for backend/services (never sold).
ALTER TABLE bots.vps_nodes
    ADD COLUMN IF NOT EXISTS reserved_slots INTEGER NOT NULL DEFAULT 0;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'vps_nodes_reserved_slots_chk'
    ) THEN
        ALTER TABLE bots.vps_nodes
            ADD CONSTRAINT vps_nodes_reserved_slots_chk
                CHECK (reserved_slots >= 0 AND reserved_slots <= max_slots);
    END IF;
END $$;


CREATE TABLE IF NOT EXISTS bots.vps_slots (
    id         UUID        NOT NULL DEFAULT gen_random_uuid(),
    node_id    UUID        NOT NULL,
    slot_index INTEGER     NOT NULL,                 -- 1-based seat number within the node
    status     TEXT        NOT NULL DEFAULT 'FREE',
    notes      TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT vps_slots_pkey           PRIMARY KEY (id),
    CONSTRAINT vps_slots_node_index_key UNIQUE (node_id, slot_index),
    CONSTRAINT vps_slots_node_fkey      FOREIGN KEY (node_id)
        REFERENCES bots.vps_nodes (id) ON DELETE CASCADE,
    CONSTRAINT vps_slots_index_chk      CHECK (slot_index >= 1),
    CONSTRAINT vps_slots_status_chk     CHECK (status IN ('FREE', 'RESERVED', 'MAINTENANCE'))
);

CREATE INDEX IF NOT EXISTS idx_vps_slots_node   ON bots.vps_slots (node_id);
CREATE INDEX IF NOT EXISTS idx_vps_slots_status ON bots.vps_slots (status);


-- updated_at trigger (reuse public.set_updated_at())
CREATE OR REPLACE TRIGGER vps_slots_set_updated_at
    BEFORE UPDATE ON bots.vps_slots
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ═════════════════════════════════════════════════════════════════════════════
-- Backfill: materialise max_slots seats for every existing node. The first
-- `reserved_slots` seats become RESERVED, the rest FREE. Idempotent — safe to
-- re-run; already-present (node, slot_index) pairs are skipped.
-- ═════════════════════════════════════════════════════════════════════════════
INSERT INTO bots.vps_slots (node_id, slot_index, status)
SELECT n.id,
       gs.i,
       CASE WHEN gs.i <= n.reserved_slots THEN 'RESERVED' ELSE 'FREE' END
FROM bots.vps_nodes n
CROSS JOIN LATERAL generate_series(1, n.max_slots) AS gs(i)
ON CONFLICT (node_id, slot_index) DO NOTHING;


-- ═════════════════════════════════════════════════════════════════════════════
-- Row Level Security — defense in depth. Schema is NOT exposed to the Data API;
-- only service_role (backend / orchestrator JDBC) gets in.
-- ═════════════════════════════════════════════════════════════════════════════
ALTER TABLE bots.vps_slots ENABLE ROW LEVEL SECURITY;
GRANT ALL ON bots.vps_slots TO service_role;

DROP POLICY IF EXISTS vps_slots_service_all ON bots.vps_slots;
CREATE POLICY vps_slots_service_all ON bots.vps_slots
    TO service_role USING (true) WITH CHECK (true);
