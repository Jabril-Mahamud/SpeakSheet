// app/api/convert-audio/polly/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { checkUsageQuota, trackUsage } from '@/utils/middleware/usage-quota';
import { v4 as uuidv4 } from 'uuid';
import { 
  PollyClient, 
  SynthesizeSpeechCommand 
} from '@aws-sdk/client-polly';
import crypto from 'crypto';

// Initialize AWS Polly client
const getPollyClient = (accessKey?: string, secretKey?: string, region?: string) => {
  // Use provided credentials or fall back to environment variables
  const credentials = accessKey && secretKey 
    ? { 
        accessKeyId: accessKey, 
        secretAccessKey: secretKey
      }
    : undefined;
  
  return new PollyClient({
    region: region || process.env.AWS_REGION || 'us-east-1',
    credentials
  });
};

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  
  // Check authentication
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const { text, voiceId, originalFilename, apiKey, secretKey, region } = await request.json();
    
    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }
    
    // Generate a hash of the content to help with deduplication
    const contentHash = crypto
      .createHash('sha256')
      .update(text + (voiceId || 'Joanna'))
      .digest('hex');
    
    // Check for cached version to avoid duplicate processing
    const { data: existingFile } = await supabase
      .from('files')
      .select('id, file_path')
      .eq('user_id', user.id)
      .eq('conversion_status', 'completed')
      .eq('voice_id', voiceId || 'Joanna')
      .eq('character_count', text.length)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (existingFile) {
      // Return the existing file ID if found
      return NextResponse.json({ fileId: existingFile.id });
    }
    
    // Check if the user has enough quota
    const quotaCheck = await checkUsageQuota(request, text.length);
    
    if (!quotaCheck.allowed) {
      return NextResponse.json(
        { 
          error: quotaCheck.error,
          quota: quotaCheck.quota
        }, 
        { status: quotaCheck.status }
      );
    }
    
    // Check if the user's subscription tier allows access to the requested voice
    const { data: voiceOption, error: voiceError } = await supabase
      .from('voice_options')
      .select(`
        voice_id,
        voice_type,
        min_tier_id
      `)
      .eq('voice_id', voiceId || 'Joanna')
      .eq('is_active', true)
      .single();
    
    if (voiceError) {
      // If voice not found, default to standard voice
      console.warn('Voice not found:', voiceId);
    } else {
      // Check if user's tier allows this voice
      const { data: userTier } = await supabase.rpc(
        'get_user_subscription_tier',
        { user_id_param: user.id }
      );
      
      if (voiceOption?.min_tier_id && userTier < voiceOption.min_tier_id) {
        return NextResponse.json({
          error: 'Your subscription tier does not include access to this voice',
          requiredTier: voiceOption.min_tier_id
        }, { status: 403 });
      }
    }
    
    // Get the user's AWS credentials if provided
    const { data: userSettings } = await supabase
      .from('user_tts_settings')
      .select('api_key')
      .eq('id', user.id)
      .single();
    
    // Generate a unique file ID
    const fileId = uuidv4();
    
    // Store file record in database
    const { error: insertError } = await supabase
      .from('files')
      .insert({
        id: fileId,
        user_id: user.id,
        file_path: `${user.id}/${fileId}.mp3`, // Path in storage
        file_type: 'audio/mpeg',
        original_name: originalFilename || `tts_${fileId}.mp3`,
        character_count: text.length,
        conversion_status: 'processing',
        voice_id: voiceId || 'Joanna'
      });
    
    if (insertError) {
      throw new Error(`Failed to create file record: ${insertError.message}`);
    }
    
    // Initialize Polly client with user credentials if provided
    const polly = getPollyClient(
      apiKey || userSettings?.api_key,
      secretKey,
      region
    );
    
    // Configure speech synthesis parameters
    const params = {
      Engine: voiceId?.includes('neural') ? 'neural' : 'standard',
      OutputFormat: 'mp3',
      Text: text,
      TextType: 'text',
      VoiceId: voiceId || 'Joanna'
    };
    
    // Synthesize speech
    const command = new SynthesizeSpeechCommand(params);
    const { AudioStream } = await polly.send(command);
    
    // Convert AudioStream to Buffer
    const chunks: Uint8Array[] = [];
    if (AudioStream) {
      for await (const chunk of AudioStream) {
        chunks.push(chunk);
      }
    }
    const buffer = Buffer.concat(chunks);
    
    // Upload audio file to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('files')
      .upload(`${user.id}/${fileId}.mp3`, buffer, {
        contentType: 'audio/mpeg',
        upsert: false
      });
    
    if (uploadError) {
      // Update file record with error
      await supabase
        .from('files')
        .update({
          conversion_status: 'error',
          conversion_error: uploadError.message
        })
        .eq('id', fileId);
      
      throw new Error(`Failed to upload file: ${uploadError.message}`);
    }
    
    // Update file record to completed status
    await supabase
      .from('files')
      .update({
        conversion_status: 'completed'
      })
      .eq('id', fileId);
    
    // Track usage
    await trackUsage(
      user.id,
      text.length,
      voiceId || 'Joanna',
      'Amazon',
      contentHash
    );
    
    // Return the file ID
    return NextResponse.json({ fileId });
    
  } catch (error) {
    console.error('TTS conversion error:', error);
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}