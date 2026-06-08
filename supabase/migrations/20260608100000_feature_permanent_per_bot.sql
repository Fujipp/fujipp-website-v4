-- ═════════════════════════════════════════════════════════════════════════════
-- Model change: features are sold PERMANENT, PER BOT.
--
-- Previously: RENT_MONTHLY (per bot) + RENT_PERMANENT (scope=ACCOUNT, all bots).
-- Now:        permanent only, scope=BOT — one purchase covers one bot, and the
--             same feature can be bought again for another bot. Runtime stays the
--             recurring top-up.
--
-- This migration only touches DATA (deactivate monthly SKUs, reprice permanent).
-- The scope=BOT behaviour lives in billing OrderService (Java); the existing
-- uq_feature_sub_bot UNIQUE(feature_id, external_subject_id) WHERE scope='BOT'
-- already enforces "one of a feature per bot", so no schema change is needed.
--
-- New permanent prices (per bot): roblox 490 THB, wallet-topup 290 THB.
-- Idempotent.
-- ═════════════════════════════════════════════════════════════════════════════

-- Stop offering monthly rental for the productized features.
UPDATE billing.feature_prices fp
   SET is_active = FALSE
  FROM billing.feature_catalog fc
 WHERE fp.feature_id = fc.id
   AND fc.code IN ('roblox-robux-payout', 'wallet-topup')
   AND fp.kind = 'RENT_MONTHLY';

-- Reprice the permanent SKU (now per-bot, so cheaper).
UPDATE billing.feature_prices fp
   SET price_satang = v.price, is_active = TRUE
  FROM billing.feature_catalog fc
  JOIN (VALUES
    ('roblox-robux-payout', 49000::bigint),
    ('wallet-topup',        29000::bigint)
  ) AS v(code, price) ON v.code = fc.code
 WHERE fp.feature_id = fc.id
   AND fp.kind = 'RENT_PERMANENT';
