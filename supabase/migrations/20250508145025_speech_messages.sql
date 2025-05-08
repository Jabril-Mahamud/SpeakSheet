-- Create speech_messages table
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

-- Grant permissions to authenticated users
GRANT ALL ON TABLE public.speech_messages TO authenticated;