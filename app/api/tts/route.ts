// app/api/tts/route.ts
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { synthesizeSpeech } from '@/lib/tts';
import { checkSubscriptionStatus } from '@/lib/subscription';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if user has an active subscription
    const isSubscribed = await checkSubscriptionStatus(user.id);
    if (!isSubscribed) {
      return NextResponse.json({ error: 'Subscription required' }, { status: 403 });
    }
    
    const { text, provider, voiceId, options } = await request.json();
    
    if (!text || !provider || !voiceId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Get user's TTS settings
    const { data: ttsSettings } = await supabase
      .from('user_tts_settings')
      .select('*')
      .eq('id', user.id)
      .single();
      
    // Check monthly character limit and usage
    const { data: usageData } = await supabase
      .from('tts_usage')
      .select('sum(characters)')
      .eq('user_id', user.id)
      .gte('synthesis_date', new Date(new Date().setDate(1)).toISOString())
      .single();
      
    const usedCharacters = usageData?.sum || 0;
    const characterLimit = 1000000; // 1 million characters per month
    
    if (usedCharacters + text.length > characterLimit) {
      return NextResponse.json({ error: 'Monthly character limit exceeded' }, { status: 403 });
    }
    
    // Synthesize speech
    const result = await synthesizeSpeech({
      text,
      provider,
      voiceId,
      userId: user.id,
      options
    });
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('TTS API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}