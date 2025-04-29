-- Create schema for SheetSpeak app
-- Migration: 20250429_init_schema.sql

-- Users table (extended profile fields)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  email TEXT,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create a secure RLS policy for the users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view and update their own data" ON public.users
  FOR ALL USING (auth.uid() = id);
CREATE POLICY "Admins can view all users" ON public.users
  FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');

-- Files table
CREATE TABLE IF NOT EXISTS public.files (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT,
  original_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  character_count INTEGER,
  conversion_status TEXT,
  audio_file_path TEXT,
  voice_id TEXT,
  conversion_error TEXT
);

-- Create RLS policy for files
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own files" ON public.files
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all files" ON public.files
  FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');

-- Speech messages table
CREATE TABLE IF NOT EXISTS public.speech_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  text TEXT NOT NULL,
  file_id UUID REFERENCES public.files,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  voice_id TEXT,
  tts_service TEXT DEFAULT 'Amazon',
  characters INTEGER
);

-- Create RLS policy for speech_messages
ALTER TABLE public.speech_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own messages" ON public.speech_messages
  FOR ALL USING (auth.uid() = user_id);

-- TTS settings table
CREATE TABLE IF NOT EXISTS public.user_tts_settings (
  id UUID PRIMARY KEY REFERENCES auth.users,
  tts_service TEXT DEFAULT 'Amazon',
  api_key TEXT,
  aws_polly_voice TEXT DEFAULT 'Joanna',
  elevenlabs_voice_id TEXT,
  elevenlabs_api_key TEXT,
  elevenlabs_stability FLOAT DEFAULT 0.5,
  elevenlabs_similarity_boost FLOAT DEFAULT 0.75,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create RLS policy for user_tts_settings
ALTER TABLE public.user_tts_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own TTS settings" ON public.user_tts_settings
  FOR ALL USING (auth.uid() = id);

-- Polly usage tracking table
CREATE TABLE IF NOT EXISTS public.polly_usage (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  characters_synthesized INTEGER NOT NULL,
  voice_id TEXT NOT NULL,
  synthesis_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  content_hash TEXT
);

-- Create RLS policy for polly_usage
ALTER TABLE public.polly_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own usage" ON public.polly_usage
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role can insert usage" ON public.polly_usage
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view all usage" ON public.polly_usage
  FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');

-- Create storage buckets
CREATE SCHEMA IF NOT EXISTS storage;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'files') THEN
        INSERT INTO storage.buckets (id, name, public) VALUES ('files', 'files', false);
    END IF;
END $$;

-- Set up storage RLS policies
CREATE POLICY "Users can upload files" ON storage.objects
  FOR INSERT WITH CHECK (auth.uid() = (storage.foldername(name))[1]::uuid);
  
CREATE POLICY "Users can view their own files" ON storage.objects
  FOR SELECT USING (auth.uid() = (storage.foldername(name))[1]::uuid);
  
CREATE POLICY "Users can update their own files" ON storage.objects
  FOR UPDATE USING (auth.uid() = (storage.foldername(name))[1]::uuid);
  
CREATE POLICY "Users can delete their own files" ON storage.objects
  FOR DELETE USING (auth.uid() = (storage.foldername(name))[1]::uuid);

-- Create function for auth triggers
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (new.id, new.email);
  
  INSERT INTO public.user_tts_settings (id, tts_service, aws_polly_voice)
  VALUES (new.id, 'Amazon', 'Joanna');
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();