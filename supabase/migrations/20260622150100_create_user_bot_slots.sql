-- ═════════════════════════════════════════════════════════════════════════════
-- Bot Slots — the permanent "right to own a bot" (separate from runtime)
--
-- Product model split:
--   Bot Slot  = สิทธิ์มีบอท   — permanent, never expires. 3 free + paid extras.
--   Runtime   = ช่องเครื่อง   — monthly, what makes a bot actually run (separate).
--   Feature   = ของติดตัวบอท  — permanent per-bot (already modelled).
--
-- A user may create at most  (free_count + paid_slots)  bots. The free allowance
-- is a platform constant (3); paid_slots is what the user has bought at 50 THB
-- each and is stored here. This table is the materialised counter; the purchase
-- receipts live in billing.credit_orders / credit_order_items (kind 'BOT_SLOT',
-- added below). Billing increments paid_slots after a successful BOT_SLOT order.
--
-- Lives in `bots` (not billing) because the create-bot cap is enforced by the
-- platform backend that owns the bots schema. billing-service writes it as
-- service_role after charging.
--
-- Access model: service_role only. Schema is NOT exposed to the Data API.
--
-- Backend impact: ADDITIVE only. New table (no entity yet) + a widened CHECK on
-- credit_order_items.kind (kind is mapped as a free String, validate is fine).
--
-- Depends on: public.set_updated_at(), public.profiles,
--             billing.credit_order_items + billing.automation_settings
--             (20260602194239)
-- ═════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS bots.user_bot_slots (
    user_id    UUID        NOT NULL,
    paid_slots INTEGER     NOT NULL DEFAULT 0,        -- permanent slots bought beyond the free 3
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT user_bot_slots_pkey      PRIMARY KEY (user_id),
    CONSTRAINT user_bot_slots_user_fkey FOREIGN KEY (user_id)
        REFERENCES public.profiles (id) ON DELETE CASCADE,
    CONSTRAINT user_bot_slots_paid_nonneg CHECK (paid_slots >= 0)
);


-- updated_at trigger (reuse public.set_updated_at())
CREATE OR REPLACE TRIGGER user_bot_slots_set_updated_at
    BEFORE UPDATE ON bots.user_bot_slots
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ═════════════════════════════════════════════════════════════════════════════
-- Row Level Security — defense in depth. service_role only.
-- ═════════════════════════════════════════════════════════════════════════════
ALTER TABLE bots.user_bot_slots ENABLE ROW LEVEL SECURITY;
GRANT ALL ON bots.user_bot_slots TO service_role;

DROP POLICY IF EXISTS user_bot_slots_service_all ON bots.user_bot_slots;
CREATE POLICY user_bot_slots_service_all ON bots.user_bot_slots
    TO service_role USING (true) WITH CHECK (true);


-- ═════════════════════════════════════════════════════════════════════════════
-- Billing wiring (data only): let an order line record a Bot Slot purchase, and
-- publish the free allowance + price so the shop and backend read one source.
-- ═════════════════════════════════════════════════════════════════════════════

-- Allow 'BOT_SLOT' as a credit order item kind (widen the existing CHECK).
ALTER TABLE billing.credit_order_items
    DROP CONSTRAINT IF EXISTS credit_order_items_kind_chk;
ALTER TABLE billing.credit_order_items
    ADD CONSTRAINT credit_order_items_kind_chk CHECK (kind IN
        ('RENT_MONTHLY', 'RENT_PERMANENT', 'SOURCE_CODE', 'RUNTIME', 'UPGRADE', 'BOT_SLOT'));

-- Free allowance + permanent slot price (50 THB = 5000 satang). Single source of
-- truth for both the create-bot cap and the buy-slot modal.
INSERT INTO billing.automation_settings (setting_key, setting_value, description) VALUES
  ('bot_slot.free_count',   '3',    'Free permanent bot slots every user starts with'),
  ('bot_slot.price_satang', '5000', 'Price of one extra permanent bot slot (50 THB)')
ON CONFLICT (setting_key) DO UPDATE SET description = EXCLUDED.description;
