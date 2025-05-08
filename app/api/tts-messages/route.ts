// app/api/tts-messages/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  
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
      .limit(limit);
    
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

export async function DELETE(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const messageId = searchParams.get('id');
  
  if (!messageId) {
    return NextResponse.json({ error: 'Message ID is required' }, { status: 400 });
  }
  
  const supabase = await createClient();
  
  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    // Get the message to check if it has a file
    const { data: message, error: messageError } = await supabase
      .from('speech_messages')
      .select('file_id')
      .eq('id', messageId)
      .eq('user_id', user.id)
      .single();
    
    if (messageError) {
      return NextResponse.json(
        { error: 'Message not found or you do not have permission to delete it' },
        { status: 404 }
      );
    }
    
    // Delete the message
    const { error: deleteError } = await supabase
      .from('speech_messages')
      .delete()
      .eq('id', messageId)
      .eq('user_id', user.id);
    
    if (deleteError) {
      throw deleteError;
    }
    
    // If the message has a file, delete it too
    if (message.file_id) {
      // First get the file path
      const { data: fileData, error: fileError } = await supabase
        .from('files')
        .select('file_path')
        .eq('id', message.file_id)
        .eq('user_id', user.id)
        .single();
      
      if (!fileError && fileData) {
        // Delete from storage
        await supabase.storage
          .from('files')
          .remove([fileData.file_path]);
        
        // Delete from database
        await supabase
          .from('files')
          .delete()
          .eq('id', message.file_id)
          .eq('user_id', user.id);
      }
    }
    
    return NextResponse.json({ message: 'Message deleted successfully' });
    
  } catch (error) {
    console.error('Error deleting message:', error);
    return NextResponse.json(
      { error: 'Failed to delete message' },
      { status: 500 }
    );
  }
}