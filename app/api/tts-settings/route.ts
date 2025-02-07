import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

interface TtsSettings {
  id: string;
  tts_service: string;
  api_key?: string;
  aws_polly_voice?: string;
  created_at: string;
  updated_at: string;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ message: "User not authenticated" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('user_tts_settings')
      .select<'*', TtsSettings>('*')
      .eq('id', user.id)
      .single();
    
    if (error) throw error;
    
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Internal server error" }, 
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ message: "User not authenticated" }, { status: 401 });
    }

    const body = await req.json();
    const { tts_service, api_key, aws_polly_voice } = body;

    if (!tts_service) {
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

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}