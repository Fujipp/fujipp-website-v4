-- ═════════════════════════════════════════════════════════════════════════════
-- Seed: price for the review-credit feature.
--
-- Makes review-credit (seeded in 20260615120100) purchasable. Sold PERMANENT only
-- (no monthly): kind = RENT_PERMANENT, duration_months NULL, scope ACCOUNT — owned
-- forever across all of the buyer's bots. Money is SATANG (THB ×100).
--
--   review-credit : permanent 190 THB
--
-- Data-only seed against existing billing tables — no schema change, idempotent.
-- Editable afterwards in the admin Pricing page.
-- ═════════════════════════════════════════════════════════════════════════════

INSERT INTO billing.feature_prices (feature_id, kind, price_satang, currency, duration_months, is_active)
SELECT fc.id, p.kind, p.price_satang, 'THB', p.duration_months, TRUE
FROM billing.feature_catalog fc
JOIN (VALUES
  ('review-credit', 'RENT_PERMANENT', 19000::bigint, NULL::int)
) AS p(code, kind, price_satang, duration_months) ON p.code = fc.code
ON CONFLICT (feature_id, kind) DO UPDATE SET
  price_satang    = EXCLUDED.price_satang,
  currency        = EXCLUDED.currency,
  duration_months = EXCLUDED.duration_months,
  is_active       = EXCLUDED.is_active;
