-- Expose the Discord context that central-bot now injects into Wallet & Top-up
-- templates. The persistent top-up panel has no current member, so only
-- guild/channel/bot values are advertised there.

WITH context_by_slot AS (
    SELECT
        slot_key,
        CASE
            WHEN slot_key = 'topup_panel' THEN ARRAY[
                'guild_id', 'guild_name',
                'channel_id', 'channel_mention',
                'bot_id', 'bot_name', 'bot_avatar_url'
            ]::text[]
            ELSE ARRAY[
                'member', 'member_id', 'member_mention', 'member_username',
                'member_display_name', 'member_avatar_url', 'avatar_url',
                'guild_id', 'guild_name',
                'channel_id', 'channel_mention',
                'bot_id', 'bot_name', 'bot_avatar_url'
            ]::text[]
        END AS context_vars
    FROM bots.embed_slots
    WHERE feature_code = 'wallet-topup'
)
UPDATE bots.embed_slots AS slot
SET available_vars = ARRAY(
    SELECT DISTINCT variable
    FROM unnest(COALESCE(slot.available_vars, ARRAY[]::text[]) || context.context_vars) AS variable
    ORDER BY variable
)
FROM context_by_slot AS context
WHERE slot.feature_code = 'wallet-topup'
  AND slot.slot_key = context.slot_key;
