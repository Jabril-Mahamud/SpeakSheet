// app/api/convert-audio/elevenlabs/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const { 
      text, 
      voiceId, 
      originalFilename, 
      stability = 0.5,
      similarityBoost = 0.75
    } = await request.json();
    
    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }
    
    // Use application's ElevenLabs API key
    const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
    
    if (!elevenLabsApiKey) {
      return NextResponse.json({ 
        error: 'ElevenLabs API key is not configured in the application'
      }, { status: 500 });
    }
    
    if (!voiceId) {
      return NextResponse.json({ 
        error: 'Voice ID is required for ElevenLabs synthesis'
      }, { status: 400 });
    }
    
    // Call ElevenLabs API
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': elevenLabsApiKey
      },
      body: JSON.stringify({
        text: text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: stability,
          similarity_boost: similarityBoost
        }
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
    }
    
    // Get audio as ArrayBuffer
    const audioArrayBuffer = await response.arrayBuffer();
    const audioBuffer = Buffer.from(audioArrayBuffer);
    
    // Generate a unique ID for the file
    const fileId = uuidv4();
    const sanitizedName = originalFilename.replace(/[^a-zA-Z0-9-_]/g, '_');
    const filePath = `${user.id}/${sanitizedName}-${fileId}.mp3`;
    
    // Upload audio to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('files')
      .upload(filePath, audioBuffer, {
        contentType: 'audio/mpeg',
        upsert: false
      });
    
    if (uploadError) {
      throw new Error(`Failed to upload audio: ${uploadError.message}`);
    }
    
    // Record file metadata in the database
    const { error: insertError } = await supabase
      .from('files')
      .insert({
        id: fileId,
        user_id: user.id,
        file_path: filePath,
        file_type: 'audio/mpeg',
        original_name: `${originalFilename}.mp3`,
        character_count: text.length,
        voice_id: voiceId
      });
    
    if (insertError) {
      throw new Error(`Failed to save file metadata: ${insertError.message}`);
    }
    
    return NextResponse.json({ 
      success: true, 
      fileId: fileId,
      message: 'Audio generated successfully'
    });
    
  } catch (error) {
    console.error('Error in ElevenLabs API:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to generate audio'
    }, { status: 500 });
  }
}