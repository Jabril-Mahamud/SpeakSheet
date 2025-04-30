// lib/tts/providers/polly.ts
import { createClient } from '@/utils/supabase/server';
import { v4 as uuidv4 } from 'uuid';
import { 
  PollyClient, 
  SynthesizeSpeechCommand,
  Engine,
  OutputFormat,
  TextType,
  VoiceId,
  SynthesizeSpeechCommandInput
} from '@aws-sdk/client-polly';

export async function synthesizeWithPolly(
  text: string,
  voiceId: string,
  userId: string,
  options?: Record<string, any>
): Promise<{ audioUrl: string; characters: number }> {
  try {
    // Initialize Polly client
    const polly = new PollyClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
      }
    });

    // Fix: Cast voiceId to VoiceId enum
    // Configure speech synthesis parameters
    const params: SynthesizeSpeechCommandInput = {
      Text: text,
      OutputFormat: OutputFormat.MP3,
      VoiceId: voiceId as unknown as VoiceId, // Type assertion to fix VoiceId type
      Engine: options?.neural ? Engine.NEURAL : Engine.STANDARD,
      TextType: text.includes('<speak>') ? TextType.SSML : TextType.TEXT
    };

    // Request speech synthesis
    const command = new SynthesizeSpeechCommand(params);
    const response = await polly.send(command);

    if (!response.AudioStream) {
      throw new Error('Failed to generate audio stream');
    }

    // Fix: Handle AudioStream correctly
    // Convert audio stream to buffer
    const chunks: Uint8Array[] = [];
    // Use the Web Streams API if the AudioStream is a ReadableStream
    if (response.AudioStream instanceof ReadableStream) {
      const reader = response.AudioStream.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) chunks.push(value);
        }
      } finally {
        reader.releaseLock();
      }
    } else {
      // Handle as Node.js Readable or ArrayBuffer
      const stream = response.AudioStream as any;
      if (stream.on && typeof stream.on === 'function') {
        // Node.js Readable
        await new Promise((resolve, reject) => {
          stream.on('data', (chunk: Uint8Array) => chunks.push(chunk));
          stream.on('error', reject);
          stream.on('end', resolve);
        });
      } else {
        // Treat as ArrayBuffer or similar
        chunks.push(new Uint8Array(await response.AudioStream.transformToByteArray()));
      }
    }
    
    const buffer = Buffer.concat(chunks);

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
      .upload(filename, buffer, {
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
    await supabase.from('polly_usage').insert({
      user_id: userId,
      characters_synthesized: text.length,
      voice_id: voiceId,
      synthesis_date: new Date().toISOString(),
      content_hash: Buffer.from(text).toString('base64').substring(0, 50) // Simple content fingerprint
    });

    return {
      audioUrl: publicUrl,
      characters: text.length
    };
  } catch (error) {
    console.error('Polly TTS error:', error);
    throw error;
  }
}