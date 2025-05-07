-- Add relationships after tables exist
ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS fk_subscriptions_tier;

ALTER TABLE public.subscriptions
  ADD CONSTRAINT fk_subscriptions_tier
    FOREIGN KEY (tier_id)
    REFERENCES public.subscription_tiers (id)
    ON DELETE CASCADE;

ALTER TABLE public.voice_options
  DROP CONSTRAINT IF EXISTS voice_options_min_tier_id_fkey;

ALTER TABLE public.voice_options
  ADD CONSTRAINT voice_options_min_tier_id_fkey
    FOREIGN KEY (min_tier_id)
    REFERENCES public.subscription_tiers (id)
    ON DELETE SET NULL;

-- Insert default subscription tiers if they don't exist
INSERT INTO public.subscription_tiers (name, monthly_price, character_limit, description, features)
SELECT 'Free', 0, 1000, 'Basic text-to-speech with limited characters and standard voices only', 
   '{"standard_voices": true, "neural_voices": false, "premium_voices": false}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.subscription_tiers WHERE name = 'Free');

INSERT INTO public.subscription_tiers (name, monthly_price, character_limit, description, features)
SELECT 'Basic', 699, 60000, 'Enhanced text-to-speech with more characters and neural voices', 
   '{"standard_voices": true, "neural_voices": true, "premium_voices": false}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.subscription_tiers WHERE name = 'Basic');

INSERT INTO public.subscription_tiers (name, monthly_price, character_limit, description, features)
SELECT 'Premium', 1999, 200000, 'Premium text-to-speech with maximum characters and all voice types', 
   '{"standard_voices": true, "neural_voices": true, "premium_voices": true}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.subscription_tiers WHERE name = 'Premium');