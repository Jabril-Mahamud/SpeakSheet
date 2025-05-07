-- 1. Add the FK constraint on subscriptions.tier_id → subscription_tiers.id
ALTER TABLE public.subscriptions
  ADD CONSTRAINT fk_subscriptions_tier
    FOREIGN KEY (tier_id)
    REFERENCES public.subscription_tiers (id)
    ON DELETE CASCADE;

-- 2. (Rollback) drop it if you ever need to revert
ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS fk_subscriptions_tier;
