// app/api/convert-audio/polly/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { v4 as uuidv4 } from 'uuid';
import {
  PollyClient,
  SynthesizeSpeechCommand,
  Engine,
  OutputFormat,
  TextType
} from "@aws-sdk/client-polly";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const { text, voiceId = 'Joanna', originalFilename } = await request.json();
    
    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }
    
    // Initialize Polly client with app credentials
    const pollyClient = new PollyClient({
      region: "us-east-1",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
      }
    });
    
    // Configure Polly synthesis parameters
    const params = {
      Engine: Engine.NEURAL,
      OutputFormat: OutputFormat.MP3,
      Text: text,
      VoiceId: voiceId,
      TextType: TextType.TEXT
    };
    
    // Execute the synthesis command
    const command = new SynthesizeSpeechCommand(params);
    const pollyResponse = await pollyClient.send(command);
    
    // Handle the audio data
    if (!pollyResponse.AudioStream) {
      throw new Error('No audio data returned from Polly');
    }
    
    // Convert audio stream to buffer
    let audioBuffer: Buffer;
    if (pollyResponse.AudioStream instanceof Uint8Array) {
      audioBuffer = Buffer.from(pollyResponse.AudioStream);
    } else {
      // Handle as Blob-like
      const arrayBuffer = await pollyResponse.AudioStream.transformToByteArray();
      audioBuffer = Buffer.from(arrayBuffer);
    }
    
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
    
    // Record usage statistics for potential future usage tracking
    try {
      await supabase
        .from('polly_usage')
        .insert({
          user_id: user.id,
          characters_synthesized: text.length,
          voice_id: voiceId,
          content_hash: Buffer.from(text).toString('base64').substring(0, 50)
        });
    } catch (usageError) {
      // Non-critical error - log but don't fail the request
      console.warn('Failed to record usage statistics:', usageError);
    }
    
    return NextResponse.json({ 
      success: true, 
      fileId: fileId,
      message: 'Audio generated successfully'
    });
    
  } catch (error) {
    console.error('Error in Polly API:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to generate audio'
    }, { status: 500 });
  }
}