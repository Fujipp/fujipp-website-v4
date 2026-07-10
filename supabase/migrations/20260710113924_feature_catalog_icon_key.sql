ALTER TABLE billing.feature_catalog ADD COLUMN IF NOT EXISTS icon_key TEXT NOT NULL DEFAULT 'shop-all';

UPDATE billing.feature_catalog
SET icon_key = CASE
    WHEN code ILIKE '%roblox%' OR code ILIKE '%robux%' THEN 'shop-roblox'
    WHEN code ILIKE '%wallet%' OR code ILIKE '%topup%' THEN 'shop-bank'
    WHEN code ILIKE '%voice%' THEN 'shop-voice'
    WHEN code ILIKE '%log%' THEN 'shop-log'
    WHEN code ILIKE '%review%' OR code ILIKE '%credit%' THEN 'shop-star'
    ELSE 'shop-all'
END;
