// app/api/tts-messages/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  
  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    // Query for speech messages
    const { data: messages, error } = await supabase
      .from('speech_messages')
      .select(`
        id,
        text,
        created_at,
        voice_id,
        tts_service,
        file_id
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (error) {
      throw error;
    }
    
    // For each message, get the audio URL for its file
    const messagesWithUrls = await Promise.all(
      messages.map(async (message) => {
        if (!message.file_id) {
          return { ...message, audioUrl: null };
        }
        
        // Get file path from files table
        const { data: fileData, error: fileError } = await supabase
          .from('files')
          .select('file_path')
          .eq('id', message.file_id)
          .single();
        
        if (fileError || !fileData) {
          console.error('Error fetching file:', fileError);
          return { ...message, audioUrl: null };
        }
        
        // Generate signed URL
        const { data: urlData, error: urlError } = await supabase.storage
          .from('files')
          .createSignedUrl(fileData.file_path, 3600); // 1 hour expiry
        
        if (urlError || !urlData) {
          console.error('Error generating URL:', urlError);
          return { ...message, audioUrl: null };
        }
        
        return { ...message, audioUrl: urlData.signedUrl };
      })
    );
    
    return NextResponse.json({ messages: messagesWithUrls });
    
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages', messages: [] },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  
  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const { fileId, text, voiceId, ttsService } = await request.json();
    
    if (!fileId || !text) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Insert message into database
    const { data, error } = await supabase
      .from('speech_messages')
      .insert({
        user_id: user.id,
        text: text,
        file_id: fileId,
        voice_id: voiceId,
        tts_service: ttsService,
        characters: text.length
      })
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    return NextResponse.json({ 
      message: 'Message saved successfully',
      id: data.id
    });
    
  } catch (error) {
    console.error('Error saving message:', error);
    return NextResponse.json(
      { error: 'Failed to save message' },
      { status: 500 }
    );
  }
}