-- Create customers table to track Stripe customers
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  stripe_customer_id TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create subscriptions table for tracking subscription status
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  status TEXT NOT NULL,
  stripe_customer_id TEXT NOT NULL,
  stripe_subscription_id TEXT NOT NULL UNIQUE,
  plan_id TEXT NOT NULL,
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS customers_user_id_idx ON public.customers(user_id);
CREATE INDEX IF NOT EXISTS customers_stripe_customer_id_idx ON public.customers(stripe_customer_id);
CREATE INDEX IF NOT EXISTS subscriptions_user_id_idx ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS subscriptions_stripe_subscription_id_idx ON public.subscriptions(stripe_subscription_id);

-- Add RLS policies
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own customer data" ON public.customers
  FOR SELECT USING (auth.uid() = user_id);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own subscriptions" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- Service role can manage all data
CREATE POLICY "Service role can manage customer data" ON public.customers
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
  
CREATE POLICY "Service role can manage subscription data" ON public.subscriptions
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Add monthly usage function
CREATE OR REPLACE FUNCTION get_monthly_character_usage(user_id_param UUID)
RETURNS BIGINT AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;