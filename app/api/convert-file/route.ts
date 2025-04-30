// app/api/convert-file/route.ts
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { extractTextFromPDF } from '@/lib/pdf/processor';
import { synthesizeSpeech, TTSProvider } from '@/lib/tts';
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
    
    // Get form data with file and parameters
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const providerValue = formData.get('provider') as string;
    const provider = providerValue as TTSProvider;  // Cast to TTSProvider type
    const voiceId = formData.get('voiceId') as string;
    
    if (!file || !provider || !voiceId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    if (!file.type.includes('pdf')) {
      return NextResponse.json({ error: 'Only PDF files are supported' }, { status: 400 });
    }
    
    // Generate file ID and path
    const fileId = uuidv4();
    const filePath = `${user.id}/${fileId}.pdf`;
    
    // Upload file to storage
    const fileBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from('files')
      .upload(filePath, fileBuffer, {
        contentType: file.type
      });
      
    if (uploadError) {
      throw new Error(`File upload error: ${uploadError.message}`);
    }
    
    // Store file record in database
    await supabase.from('files').insert({
      id: fileId,
      user_id: user.id,
      file_path: filePath,
      file_type: file.type,
      original_name: file.name,
      conversion_status: 'processing'
    });
    
    // Extract text from PDF
    const text = await extractTextFromPDF(fileBuffer);
    
    // Check monthly character limit and usage
    const { data: usageData } = await supabase
      .from('tts_usage')
      .select('sum(characters)')
      .eq('user_id', user.id)
      .gte('synthesis_date', new Date(new Date().setDate(1)).toISOString())
      .single();
      
      
    const usedCharacters = Number(usageData?.sum || 0);  // Convert to number explicitlyQ
    const characterLimit = 1000000; // 1 million characters per month
    
    if (usedCharacters + text.length > characterLimit) {
      // Update file status to error
      await supabase.from('files')
        .update({ 
          conversion_status: 'error',
          conversion_error: 'Monthly character limit exceeded'
        })
        .eq('id', fileId);
        
      return NextResponse.json({ error: 'Monthly character limit exceeded' }, { status: 403 });
    }
    
    // Update file with character count
    await supabase.from('files')
      .update({ character_count: text.length })
      .eq('id', fileId);
    
    // Synthesize speech
    const { audioUrl } = await synthesizeSpeech({
      text,
      provider,
      voiceId,
      userId: user.id,
      options: JSON.parse(formData.get('options') as string || '{}')
    });
    
    // Update file record with audio path
    await supabase.from('files')
      .update({ 
        audio_file_path: audioUrl,
        voice_id: voiceId,
        conversion_status: 'completed'
      })
      .eq('id', fileId);
    
    return NextResponse.json({
      fileId,
      audioUrl,
      characters: text.length
    });
  } catch (error) {
    console.error('File conversion error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}