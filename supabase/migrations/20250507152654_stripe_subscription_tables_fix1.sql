-- Create subscription_tiers table
CREATE TABLE IF NOT EXISTS public.subscription_tiers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  monthly_price INTEGER NOT NULL,
  character_limit INTEGER NOT NULL,
  description TEXT,
  features JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create subscriptions table with NO foreign key
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  tier_id INTEGER NOT NULL,
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  status TEXT NOT NULL,
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create tts_usage table
CREATE TABLE IF NOT EXISTS public.tts_usage (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  characters INTEGER NOT NULL,
  voice_id TEXT NOT NULL,
  tts_service TEXT NOT NULL,
  synthesis_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  content_hash TEXT
);

-- Create voice_options table
CREATE TABLE IF NOT EXISTS public.voice_options (
  id SERIAL PRIMARY KEY,
  voice_id TEXT NOT NULL,
  name TEXT NOT NULL,
  tts_service TEXT NOT NULL,
  voice_type TEXT NOT NULL,
  min_tier_id INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);