-- ═════════════════════════════════════════════════════════════════════════════
-- Runtime becomes a movable, slot-bound thing (not welded 1:1 to a bot)
--
-- Old model: runtime_subscriptions had UNIQUE(external_subject_id) NOT NULL — a
-- runtime WAS a bot's runtime, forever. You could not buy a runtime unassigned,
-- could not move it to another bot, and it occupied no explicit VPS seat.
--
-- New model (the product we want):
--   • a runtime occupies ONE bots.vps_slots seat            → vps_slot_id
--   • a runtime is assigned to AT MOST ONE bot, and can move → external_subject_id
--     (kept as the bot link; now NULLABLE so a runtime can be bought unassigned)
--   • a bot has at most ONE active runtime                   → partial unique
--   • a slot holds at most ONE active runtime                → partial unique
--
-- external_subject_id stays the bot link (no new column) to honour billing's
-- "decoupled, FK-less TEXT subject id" convention. vps_slot_id DOES get a real
-- FK to bots.vps_slots — a slot is infrastructure, not the decoupled subject —
-- with ON DELETE SET NULL so deleting a seat never deletes a paid runtime.
--
-- This migration only relaxes constraints and backfills data; it does NOT enable
-- the buy-unassigned / move flows. Those need billing-service logic (wiring
-- phase). The billing RuntimeSubscription entity still maps external_subject_id
-- as non-null and always sets it, so ddl-auto=validate stays green:
--   • validate checks column existence + type, not NULLability or uniqueness
--   • the new vps_slot_id column is simply unmapped for now (ignored by validate)
--
-- Depends on: billing.runtime_subscriptions (20260602194239),
--             bots.vps_slots (20260622150000), bots.bot_instances
-- ═════════════════════════════════════════════════════════════════════════════

-- ─── 1. Which seat this runtime occupies (FK to the slot inventory) ──────────
ALTER TABLE billing.runtime_subscriptions
    ADD COLUMN IF NOT EXISTS vps_slot_id UUID;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'runtime_subscriptions_vps_slot_fkey'
    ) THEN
        ALTER TABLE billing.runtime_subscriptions
            ADD CONSTRAINT runtime_subscriptions_vps_slot_fkey FOREIGN KEY (vps_slot_id)
                REFERENCES bots.vps_slots (id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_runtime_sub_slot
    ON billing.runtime_subscriptions (vps_slot_id);


-- ─── 2. Allow a runtime to exist without a bot (bought, not yet assigned) ────
ALTER TABLE billing.runtime_subscriptions
    ALTER COLUMN external_subject_id DROP NOT NULL;

-- Replace the all-status UNIQUE(external_subject_id) with the real rules:
--   one ACTIVE runtime per bot, and one ACTIVE runtime per slot.
-- (The old constraint even blocked re-buying after CANCEL — the partial index
-- scoped to ACTIVE fixes that too.)
ALTER TABLE billing.runtime_subscriptions
    DROP CONSTRAINT IF EXISTS runtime_subscriptions_subject_key;

CREATE UNIQUE INDEX IF NOT EXISTS uq_runtime_active_bot
    ON billing.runtime_subscriptions (external_subject_id)
    WHERE status = 'ACTIVE' AND external_subject_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_runtime_active_slot
    ON billing.runtime_subscriptions (vps_slot_id)
    WHERE status = 'ACTIVE' AND vps_slot_id IS NOT NULL;


-- ─── 3. Backfill: park each existing ACTIVE runtime on a real seat ───────────
-- The bot it already runs (external_subject_id) sits on a node
-- (bot_instances.vps_node_id); give the runtime the lowest-numbered FREE seat on
-- that node. Distinct runtimes on the same node get distinct seats (row_number
-- pairing). Idempotent: only fills rows whose vps_slot_id is still NULL. Runtimes
-- whose bot has no node placement are left unparked (vps_slot_id stays NULL).
WITH ranked_runtime AS (
    SELECT r.id   AS runtime_id,
           b.vps_node_id AS node_id,
           row_number() OVER (PARTITION BY b.vps_node_id ORDER BY r.created_at, r.id) AS rn
    FROM billing.runtime_subscriptions r
    JOIN bots.bot_instances b
      ON r.external_subject_id IS NOT NULL
     AND b.id = r.external_subject_id::uuid
    WHERE r.status = 'ACTIVE'
      AND r.vps_slot_id IS NULL
      AND b.vps_node_id IS NOT NULL
),
ranked_slots AS (
    SELECT s.id      AS slot_id,
           s.node_id AS node_id,
           row_number() OVER (PARTITION BY s.node_id ORDER BY s.slot_index) AS rn
    FROM bots.vps_slots s
    WHERE s.status = 'FREE'
)
UPDATE billing.runtime_subscriptions r
   SET vps_slot_id = m.slot_id
  FROM (
        SELECT rr.runtime_id, rs.slot_id
        FROM ranked_runtime rr
        JOIN ranked_slots  rs
          ON rs.node_id = rr.node_id
         AND rs.rn      = rr.rn
       ) AS m
 WHERE r.id = m.runtime_id;
