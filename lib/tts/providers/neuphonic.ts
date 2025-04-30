// lib/tts/providers/neuphonic.ts
import { createClient } from '@/utils/supabase/server';
import { v4 as uuidv4 } from 'uuid';

export async function synthesizeWithNeuphonic(
  text: string, 
  voiceId: string, 
  userId: string,
  options?: Record<string, any>
): Promise<{ audioUrl: string; characters: number }> {
  try {
    const apiKey = process.env.NEUPHONIC_API_KEY;
    if (!apiKey) {
      throw new Error('Neuphonic API key not configured');
    }

    const response = await fetch('https://api.neuphonic.ai/v1/text-to-speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        text: text,
        voice: voiceId,
        output_format: 'mp3',
        speed: options?.speed || 1.0,
        pitch: options?.pitch || 1.0,
      }),
    });

    if (!response.ok) {
      throw new Error(`Neuphonic API error: ${response.statusText}`);
    }

    const audioBuffer = await response.arrayBuffer();
    
    // Upload to Supabase storage
    const supabase = await createClient();
    const filename = `${userId}/${uuidv4()}.mp3`;
    const { error: uploadError } = await supabase.storage
      .from('audio')
      .upload(filename, audioBuffer, {
        contentType: 'audio/mpeg',
      });
      
    if (uploadError) {
      throw new Error(`Storage upload error: ${uploadError.message}`);
    }
    
    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from('audio')
      .getPublicUrl(filename);
      
    // Track usage in database
    await supabase.from('tts_usage').insert({
      user_id: userId,
      characters: text.length,
      provider: 'Neuphonic',
      voice_id: voiceId,
    });
    
    return {
      audioUrl: publicUrl,
      characters: text.length
    };
  } catch (error) {
    console.error('Neuphonic TTS error:', error);
    throw error;
  }
}