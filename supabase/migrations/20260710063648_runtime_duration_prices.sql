-- Runtime duration packages: exact customer-facing monthly options.
-- Keeps the catalog ids stable for existing subscriptions while making each
-- package active and preventing an old promotion from overriding its price.
INSERT INTO billing.runtime_plans (
    code,
    name,
    duration_months,
    price_satang,
    promotion_label,
    promotion_price_satang,
    promotion_starts_at,
    promotion_ends_at,
    sort_order,
    is_featured,
    is_active
)
VALUES
    ('runtime-1m', 'Runtime 24/7 — 1 เดือน', 1,  9900, NULL, NULL, NULL, NULL, 10, TRUE,  TRUE),
    ('runtime-2m', 'Runtime 24/7 — 2 เดือน', 2, 19900, NULL, NULL, NULL, NULL, 20, FALSE, TRUE),
    ('runtime-3m', 'Runtime 24/7 — 3 เดือน', 3, 29900, NULL, NULL, NULL, NULL, 30, FALSE, TRUE)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    duration_months = EXCLUDED.duration_months,
    price_satang = EXCLUDED.price_satang,
    promotion_label = EXCLUDED.promotion_label,
    promotion_price_satang = EXCLUDED.promotion_price_satang,
    promotion_starts_at = EXCLUDED.promotion_starts_at,
    promotion_ends_at = EXCLUDED.promotion_ends_at,
    sort_order = EXCLUDED.sort_order,
    is_featured = EXCLUDED.is_featured,
    is_active = EXCLUDED.is_active;
