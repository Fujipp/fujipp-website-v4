-- ═════════════════════════════════════════════════════════════════════════════
-- Platform monitoring: historical metric snapshots + service incidents.
--
-- Backs the /performance dashboard (Phase 4 + 5):
--   monitoring.metric_snapshots — periodic CPU/RAM/disk/network/latency samples
--     captured by the backend's scheduled HealthMonitorService (one row per probe
--     run, keyed by `service`). Powers the admin VPS history graphs.
--   monitoring.incidents — open/resolved service incidents, opened automatically
--     when a probed service flips to degraded/down and resolved when it recovers.
--     A public-safe subset (service/severity/title/timestamps) is exposed via
--     GET /api/public/incidents.
--
-- Access model: the backend connects as the privileged `postgres` role (BYPASSRLS)
-- and is the ONLY reader/writer — the frontend never queries these tables directly,
-- it goes through backend endpoints. The `monitoring` schema is NOT in Supabase's
-- exposed PostgREST schemas, so anon/authenticated keys cannot reach it. RLS is
-- still enabled with no policies as defense-in-depth (deny-all to API roles).
-- ═════════════════════════════════════════════════════════════════════════════

CREATE SCHEMA IF NOT EXISTS monitoring;

-- ─── metric_snapshots ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS monitoring.metric_snapshots (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    captured_at       timestamptz NOT NULL DEFAULT now(),
    service           text NOT NULL,
    status            text NOT NULL DEFAULT 'operational'
                          CHECK (status IN ('operational', 'degraded', 'down', 'online', 'offline', 'unknown')),
    -- double precision (float8) to match the backend's Double fields under ddl-auto=validate.
    cpu_percent       double precision,
    ram_percent       double precision,
    disk_percent      double precision,
    network_in_kbps   double precision,
    network_out_kbps  double precision,
    latency_ms        integer
);

-- Most reads are "latest N for this service", newest first.
CREATE INDEX IF NOT EXISTS idx_metric_snapshots_service_captured
    ON monitoring.metric_snapshots (service, captured_at DESC);

ALTER TABLE monitoring.metric_snapshots ENABLE ROW LEVEL SECURITY;

-- ─── incidents ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS monitoring.incidents (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    service       text NOT NULL,
    severity      text NOT NULL CHECK (severity IN ('info', 'warning', 'down')),
    title         text NOT NULL,
    detail        text,
    status        text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
    started_at    timestamptz NOT NULL DEFAULT now(),
    resolved_at   timestamptz,
    created_at    timestamptz NOT NULL DEFAULT now()
);

-- Status page lists recent incidents newest-first; the collector looks up the
-- currently-open incident per service to avoid duplicating an ongoing outage.
CREATE INDEX IF NOT EXISTS idx_incidents_started ON monitoring.incidents (started_at DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_open_service ON monitoring.incidents (service) WHERE status = 'open';

ALTER TABLE monitoring.incidents ENABLE ROW LEVEL SECURITY;
