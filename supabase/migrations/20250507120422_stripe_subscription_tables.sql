-- Migration: 20250507_subscription_schema.sql

-- Create subscription_tiers table
CREATE TABLE IF NOT EXISTS public.subscription_tiers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  monthly_price INTEGER NOT NULL, -- Price in cents
  character_limit INTEGER NOT NULL,
  description TEXT,
  features JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  tier_id INTEGER REFERENCES public.subscription_tiers NOT NULL,
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  status TEXT NOT NULL, -- 'active', 'canceled', 'past_due', etc.
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create tts_usage table to track character usage
CREATE TABLE IF NOT EXISTS public.tts_usage (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  characters INTEGER NOT NULL,
  voice_id TEXT NOT NULL,
  tts_service TEXT NOT NULL,
  synthesis_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  content_hash TEXT -- To help with deduplication
);

-- Create table for voice_options that includes tier restrictions
CREATE TABLE IF NOT EXISTS public.voice_options (
  id SERIAL PRIMARY KEY,
  voice_id TEXT NOT NULL,
  name TEXT NOT NULL,
  tts_service TEXT NOT NULL, -- 'AWS Polly', 'ElevenLabs', etc.
  voice_type TEXT NOT NULL, -- 'standard', 'neural', 'premium', etc.
  min_tier_id INTEGER REFERENCES public.subscription_tiers, -- Minimum tier required
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create RLS policies
ALTER TABLE public.subscription_tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view subscription tiers" ON public.subscription_tiers
  FOR SELECT USING (true);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own subscriptions" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage subscriptions" ON public.subscriptions
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE public.tts_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own usage" ON public.tts_usage
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role can insert usage" ON public.tts_usage
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

ALTER TABLE public.voice_options ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view voice options" ON public.voice_options
  FOR SELECT USING (true);

-- Insert default subscription tiers
INSERT INTO public.subscription_tiers (name, monthly_price, character_limit, description, features)
VALUES 
  ('Free', 0, 1000, 'Basic text-to-speech with limited characters and standard voices only', 
   '{"standard_voices": true, "neural_voices": false, "premium_voices": false}'::jsonb),
  ('Basic', 699, 60000, 'Enhanced text-to-speech with more characters and neural voices', 
   '{"standard_voices": true, "neural_voices": true, "premium_voices": false}'::jsonb),
  ('Premium', 1999, 200000, 'Premium text-to-speech with maximum characters and all voice types', 
   '{"standard_voices": true, "neural_voices": true, "premium_voices": true}'::jsonb);

-- Modify the get_monthly_character_usage function to account for tiers
CREATE OR REPLACE FUNCTION public.get_monthly_character_usage(user_id_param uuid)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_chars BIGINT;
BEGIN
  -- Get current month's start date
  WITH month_start AS (
    SELECT DATE_TRUNC('month', NOW()) as start_date
  )
  
  -- Sum up characters from various sources
  SELECT COALESCE(SUM(chars), 0) INTO total_chars FROM (
    -- From Polly usage
    SELECT COALESCE(SUM(characters_synthesized), 0) as chars
    FROM polly_usage
    WHERE user_id = user_id_param
    AND synthesis_date >= (SELECT start_date FROM month_start)
    
    UNION ALL
    
    -- From general TTS usage
    SELECT COALESCE(SUM(characters), 0) as chars
    FROM tts_usage
    WHERE user_id = user_id_param
    AND synthesis_date >= (SELECT start_date FROM month_start)
  ) AS combined_usage;
  
  RETURN total_chars;
END;
$$;

-- Function to get user's subscription tier
CREATE OR REPLACE FUNCTION public.get_user_subscription_tier(user_id_param uuid)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  tier_id INTEGER;
BEGIN
  SELECT tier_id INTO tier_id 
  FROM subscriptions 
  WHERE user_id = user_id_param 
    AND status = 'active' 
    AND current_period_end > NOW()
  ORDER BY tier_id DESC 
  LIMIT 1;
  
  -- If no active subscription, return the free tier (id=1)
  IF tier_id IS NULL THEN
    RETURN 1;
  END IF;
  
  RETURN tier_id;
END;
$$;

-- Function to check if a user has available quota
CREATE OR REPLACE FUNCTION public.has_available_quota(user_id_param uuid, requested_chars integer)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_usage BIGINT;
  tier_limit INTEGER;
  tier_id INTEGER;
BEGIN
  -- Get the user's current monthly usage
  SELECT public.get_monthly_character_usage(user_id_param) INTO current_usage;
  
  -- Get the user's subscription tier limit
  SELECT public.get_user_subscription_tier(user_id_param) INTO tier_id;
  
  -- Get the character limit for the tier
  SELECT character_limit INTO tier_limit 
  FROM subscription_tiers 
  WHERE id = tier_id;
  
  -- Check if the user has enough quota left
  RETURN (current_usage + requested_chars) <= tier_limit;
END;
$$;