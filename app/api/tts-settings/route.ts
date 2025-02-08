import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { captureServerEvent } from "@/utils/posthog-server";

interface TtsSettings {
  id: string;
  tts_service: string;
  api_key?: string;
  aws_polly_voice?: string;
  created_at: string;
  updated_at: string;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  try {
    if (!user) {
      await captureServerEvent('tts_settings_unauthorized', user, {
        error: 'User not authenticated'
      });
      return NextResponse.json({ message: "User not authenticated" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('user_tts_settings')
      .select<'*', TtsSettings>('*')
      .eq('id', user.id)
      .single();
    
    if (error) {
      await captureServerEvent('tts_settings_error', user, {
        error: error.message,
        stage: 'fetch'
      });
      throw error;
    }

    await captureServerEvent('tts_settings_fetched', user, {
      hasSettings: !!data,
      tts_service: data?.tts_service
    });
    
    return NextResponse.json(data);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    
    await captureServerEvent('tts_settings_error', user, {
      error: errorMessage,
      stage: 'unknown'
    });

    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  try {
    if (!user) {
      await captureServerEvent('tts_settings_unauthorized', user, {
        error: 'User not authenticated'
      });
      return NextResponse.json({ message: "User not authenticated" }, { status: 401 });
    }

    const body = await req.json();
    const { tts_service, api_key, aws_polly_voice } = body;

    if (!tts_service) {
      await captureServerEvent('tts_settings_error', user, {
        error: 'TTS service is required',
        stage: 'validation'
      });
      return NextResponse.json(
        { message: "TTS service is required" },
        { status: 400 }
      );
    }

    const ttsSettings: Partial<TtsSettings> = {
      id: user.id,
      tts_service,
      api_key: api_key || null,
      aws_polly_voice: aws_polly_voice || null,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('user_tts_settings')
      .upsert(ttsSettings)
      .select()
      .single();

    if (error) {
      await captureServerEvent('tts_settings_error', user, {
        error: error.message,
        stage: 'update'
      });
      throw error;
    }

    await captureServerEvent('tts_settings_updated', user, {
      tts_service,
      has_api_key: !!api_key,
      aws_polly_voice: !!aws_polly_voice
    });

    return NextResponse.json(data);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    
    await captureServerEvent('tts_settings_error', user, {
      error: errorMessage,
      stage: 'unknown'
    });

    return NextResponse.json(
      { message: errorMessage },
      { status: 500 }
    );
  }
}