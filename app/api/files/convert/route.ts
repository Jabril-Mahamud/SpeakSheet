// app/api/files/convert/route.ts
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { processPDFFile } from '@/lib/pdf/processor';
import { synthesizeSpeech, TTSProvider } from '@/lib/tts';
import { checkSubscriptionStatus } from '@/lib/subscription';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check subscription
    const isSubscribed = await checkSubscriptionStatus(user.id);
    if (!isSubscribed) {
      return NextResponse.json({ error: 'Subscription required' }, { status: 403 });
    }
    
    const { fileId, provider, voiceId, options } = await request.json();
    
    if (!fileId || !provider || !voiceId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Update conversion status
    await supabase
      .from('files')
      .update({ conversion_status: 'processing' })
      .eq('id', fileId)
      .eq('user_id', user.id);
    
    // Extract text from PDF
    const { text, characterCount } = await processPDFFile(fileId, user.id);
    
    // Check character limits
    const { data: usageData } = await supabase.rpc('get_monthly_character_usage', {
      user_id_param: user.id
    });
    
    const usedCharacters = Number(usageData || 0);
    const characterLimit = 1000000; // 1 million chars per month
    
    if (usedCharacters + characterCount > characterLimit) {
      await supabase
        .from('files')
        .update({ 
          conversion_status: 'error',
          conversion_error: 'Monthly character limit exceeded'
        })
        .eq('id', fileId);
        
      return NextResponse.json({ error: 'Monthly character limit exceeded' }, { status: 403 });
    }
    
    // Synthesize speech
    const { audioUrl } = await synthesizeSpeech({
      text,
      provider: provider as TTSProvider,
      voiceId,
      userId: user.id,
      options
    });
    
    // Update file record
    await supabase
      .from('files')
      .update({
        conversion_status: 'completed',
        audio_file_path: audioUrl,
        voice_id: voiceId,
        character_count: characterCount
      })
      .eq('id', fileId);
    
    return NextResponse.json({
      fileId,
      audioUrl,
      characterCount
    });
  } catch (error) {
    console.error('Conversion error:', error);
    return NextResponse.json({ error: 'Conversion failed' }, { status: 500 });
  }
}