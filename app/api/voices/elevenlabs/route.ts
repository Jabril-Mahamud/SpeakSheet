import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { captureServerEvent } from "@/utils/posthog-server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  try {
    if (!user) {
      await captureServerEvent('elevenlabs_voices_unauthorized', user, {
        error: 'User not authenticated'
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's ElevenLabs API key from settings
    const { data: settings } = await supabase
      .from('user_tts_settings')
      .select('elevenlabs_api_key')
      .eq('id', user.id)
      .single();

    if (!settings?.elevenlabs_api_key) {
      await captureServerEvent('elevenlabs_voices_error', user, {
        error: 'Missing API key'
      });
      return NextResponse.json({ error: "ElevenLabs API key not configured" }, { status: 400 });
    }

    await captureServerEvent('elevenlabs_voices_fetch_started', user);

    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: {
        'Accept': 'application/json',
        'xi-api-key': settings.elevenlabs_api_key
      }
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(`ElevenLabs API error: ${error.detail || response.statusText}`);
    }

    const data = await response.json();

    await captureServerEvent('elevenlabs_voices_fetched', user, {
      voiceCount: data.voices?.length
    });

    return NextResponse.json(data.voices);
  } catch (error) {
    console.error('Error fetching ElevenLabs voices:', error);
    
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch voices";
    
    await captureServerEvent('elevenlabs_voices_error', user, {
      error: errorMessage
    });

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}