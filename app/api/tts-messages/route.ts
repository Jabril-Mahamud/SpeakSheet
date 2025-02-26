// api/tts-messages/route.ts
// This file adds CRUD operations for speech messages

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { captureServerEvent } from "@/utils/posthog-server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  try {
    if (!user) {
      await captureServerEvent('tts_messages_unauthorized', null, {
        error: 'User not authenticated'
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get limit and page parameters from query string
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const page = parseInt(url.searchParams.get('page') || '0');
    const offset = page * limit;

    // Get messages for the user
    const { data: messages, error, count } = await supabase
      .from('speech_messages')
      .select('*, files!inner(file_path)', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      await captureServerEvent('tts_messages_error', user, {
        error: error.message,
        stage: 'fetch'
      });
      throw error;
    }

    // Generate signed URLs for each file
    const messagesWithUrls = await Promise.all(
      messages.map(async (message) => {
        // Check if message has a file attached
        if (message.file_id && message.files?.file_path) {
          // Get signed URL for the file
          const { data: urlData } = await supabase.storage
            .from('files')
            .createSignedUrl(message.files.file_path, 3600);

          return {
            ...message,
            audioUrl: urlData?.signedUrl || null,
            files: undefined  // Remove the files object
          };
        }
        return {
          ...message,
          audioUrl: null,
          files: undefined
        };
      })
    );

    await captureServerEvent('tts_messages_fetched', user, {
      messageCount: messagesWithUrls.length,
      page,
      limit
    });

    return NextResponse.json({
      messages: messagesWithUrls,
      count,
      page,
      limit
    });

  } catch (error) {
    console.error('Error fetching speech messages:', error);
    
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch messages";
    
    await captureServerEvent('tts_messages_error', user, {
      error: errorMessage
    });

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  try {
    if (!user) {
      await captureServerEvent('tts_messages_unauthorized', null, {
        error: 'User not authenticated'
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { fileId, text, voiceId, ttsService } = await request.json();

    if (!text || !fileId) {
      await captureServerEvent('tts_messages_error', user, {
        error: 'Missing required fields',
        stage: 'validation'
      });
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Insert the new message
    const { data: message, error } = await supabase
      .from('speech_messages')
      .insert({
        user_id: user.id,
        text,
        file_id: fileId,
        voice_id: voiceId || null,
        tts_service: ttsService || 'Amazon',
        characters: text.length
      })
      .select()
      .single();

    if (error) {
      await captureServerEvent('tts_messages_error', user, {
        error: error.message,
        stage: 'insert'
      });
      throw error;
    }

    // Get the file path
    const { data: fileData, error: fileError } = await supabase
      .from('files')
      .select('file_path')
      .eq('id', fileId)
      .single();

    if (fileError) {
      await captureServerEvent('tts_messages_error', user, {
        error: fileError.message,
        stage: 'fetch_file'
      });
      throw fileError;
    }

    // Get signed URL for the file
    const { data: urlData } = await supabase.storage
      .from('files')
      .createSignedUrl(fileData.file_path, 3600);

    await captureServerEvent('tts_message_created', user, {
      messageId: message.id,
      textLength: text.length,
      voiceId,
      ttsService
    });

    return NextResponse.json({
      message: {
        ...message,
        audioUrl: urlData?.signedUrl || null
      }
    });

  } catch (error) {
    console.error('Error creating speech message:', error);
    
    const errorMessage = error instanceof Error ? error.message : "Failed to create message";
    
    await captureServerEvent('tts_messages_error', user, {
      error: errorMessage
    });

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  try {
    if (!user) {
      await captureServerEvent('tts_messages_unauthorized', null, {
        error: 'User not authenticated'
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const messageId = url.searchParams.get('id');

    if (!messageId) {
      await captureServerEvent('tts_messages_error', user, {
        error: 'Missing message ID',
        stage: 'validation'
      });
      return NextResponse.json(
        { error: "Missing message ID" },
        { status: 400 }
      );
    }

    // Get file ID before deleting message
    const { data: message, error: fetchError } = await supabase
      .from('speech_messages')
      .select('file_id')
      .eq('id', messageId)
      .eq('user_id', user.id)
      .single();

    if (fetchError) {
      await captureServerEvent('tts_messages_error', user, {
        error: fetchError.message,
        stage: 'fetch_message'
      });
      throw fetchError;
    }

    // Delete the message
    const { error } = await supabase
      .from('speech_messages')
      .delete()
      .eq('id', messageId)
      .eq('user_id', user.id);

    if (error) {
      await captureServerEvent('tts_messages_error', user, {
        error: error.message,
        stage: 'delete'
      });
      throw error;
    }

    // Optionally, also delete the associated file
    if (message?.file_id) {
      const { data: fileData, error: fileError } = await supabase
        .from('files')
        .select('file_path')
        .eq('id', message.file_id)
        .single();

      if (!fileError && fileData) {
        // Delete from storage
        await supabase.storage
          .from('files')
          .remove([fileData.file_path]);

        // Delete file record
        await supabase
          .from('files')
          .delete()
          .eq('id', message.file_id);
      }
    }

    await captureServerEvent('tts_message_deleted', user, {
      messageId,
      fileDeleted: !!message?.file_id
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error deleting speech message:', error);
    
    const errorMessage = error instanceof Error ? error.message : "Failed to delete message";
    
    await captureServerEvent('tts_messages_error', user, {
      error: errorMessage
    });

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}