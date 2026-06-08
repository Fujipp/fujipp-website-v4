-- ═════════════════════════════════════════════════════════════════════════════
-- Seed: prices for the Roblox + wallet-topup features
--
-- Makes the features from 20260605170000_seed_roblox_feature.sql purchasable.
-- Money is SATANG (THB ×100). RENT_MONTHLY has duration_months = 1; RENT_PERMANENT
-- is open-ended (duration_months NULL, scope=ACCOUNT — owned forever, all bots).
--
--   roblox-robux-payout : rent  99 THB/mo  ·  permanent 990 THB
--   wallet-topup        : rent  49 THB/mo  ·  permanent 490 THB
--
-- Data-only seed against existing billing tables — no schema change, idempotent.
-- ═════════════════════════════════════════════════════════════════════════════

INSERT INTO billing.feature_prices (feature_id, kind, price_satang, currency, duration_months, is_active)
SELECT fc.id, p.kind, p.price_satang, 'THB', p.duration_months, TRUE
FROM billing.feature_catalog fc
JOIN (VALUES
  ('roblox-robux-payout', 'RENT_MONTHLY',    9900::bigint, 1::int),
  ('roblox-robux-payout', 'RENT_PERMANENT', 99000::bigint, NULL::int),
  ('wallet-topup',        'RENT_MONTHLY',    4900::bigint, 1::int),
  ('wallet-topup',        'RENT_PERMANENT', 49000::bigint, NULL::int)
) AS p(code, kind, price_satang, duration_months) ON p.code = fc.code
ON CONFLICT (feature_id, kind) DO UPDATE SET
  price_satang    = EXCLUDED.price_satang,
  currency        = EXCLUDED.currency,
  duration_months = EXCLUDED.duration_months,
  is_active       = EXCLUDED.is_active;
