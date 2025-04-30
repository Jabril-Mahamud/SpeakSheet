// lib/tts/providers/elevenlabs.ts
import { createClient } from '@/utils/supabase/server';
import { v4 as uuidv4 } from 'uuid';

export async function synthesizeWithElevenLabs(
  text: string,
  voiceId: string,
  userId: string,
  options?: Record<string, any>
): Promise<{ audioUrl: string; characters: number }> {
  try {
    const apiKey = options?.apiKey || process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      throw new Error('ElevenLabs API key not configured');
    }

    // Default settings if not provided
    const stability = options?.stability || 0.5;
    const similarityBoost = options?.similarityBoost || 0.75;
    const modelId = options?.modelId || 'eleven_monolingual_v1';

    // ElevenLabs API request
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': apiKey
        },
        body: JSON.stringify({
          text,
          model_id: modelId,
          voice_settings: {
            stability,
            similarity_boost: similarityBoost
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
    }

    const audioBuffer = await response.arrayBuffer();
    
    // Upload to Supabase storage
    const supabase = await createClient();
    const filename = `${userId}/${uuidv4()}.mp3`;
    
    // Create the audio bucket if it doesn't exist
    const { error: bucketError } = await supabase.storage.getBucket('audio');
    if (bucketError) {
      await supabase.storage.createBucket('audio', {
        public: true,
        fileSizeLimit: 50 * 1024 * 1024 // 50MB limit
      });
    }
    
    const { error: uploadError } = await supabase.storage
      .from('audio')
      .upload(filename, audioBuffer, {
        contentType: 'audio/mpeg'
      });
      
    if (uploadError) {
      throw new Error(`Storage upload error: ${uploadError.message}`);
    }
    
    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from('audio')
      .getPublicUrl(filename);
      
    // Track usage in database
    // First check if user has elevenlabs table, if not use the general tts_usage table
    const hasElevenLabsTable = await supabase
      .from('information_schema.tables')
      .select('*')
      .eq('table_name', 'elevenlabs_usage')
      .maybeSingle();
      
    if (hasElevenLabsTable.data) {
      await supabase.from('elevenlabs_usage').insert({
        user_id: userId,
        characters_synthesized: text.length,
        voice_id: voiceId,
        synthesis_date: new Date().toISOString(),
        model_id: modelId
      });
    } else {
      await supabase.from('tts_usage').insert({
        user_id: userId,
        characters: text.length,
        provider: 'ElevenLabs',
        voice_id: voiceId,
        synthesis_date: new Date().toISOString()
      });
    }
    
    return {
      audioUrl: publicUrl,
      characters: text.length
    };
  } catch (error) {
    console.error('ElevenLabs TTS error:', error);
    throw error;
  }
}