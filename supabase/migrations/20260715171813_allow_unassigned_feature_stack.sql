-- A BOT-scoped feature can be held without a bot. Each unassigned row is one
-- unused stack item; assigning it later fills external_subject_id.
ALTER TABLE billing.feature_subscriptions
    DROP CONSTRAINT IF EXISTS feature_subscriptions_scope_subject_chk;

ALTER TABLE billing.feature_subscriptions
    ADD CONSTRAINT feature_subscriptions_scope_subject_chk CHECK (
        scope = 'BOT'
        OR (scope = 'ACCOUNT' AND external_subject_id IS NULL)
    );

DROP INDEX IF EXISTS billing.uq_feature_sub_bot;

CREATE UNIQUE INDEX uq_feature_sub_bot
    ON billing.feature_subscriptions (feature_id, external_subject_id)
    WHERE scope = 'BOT'
      AND external_subject_id IS NOT NULL
      AND status <> 'CANCELED';
