-- Create the files table if it doesn't exist
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