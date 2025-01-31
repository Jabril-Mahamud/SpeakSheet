import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { TtsSettings } from "@/utils/type"; // Import your existing type

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return new Response(JSON.stringify({ message: "User not authenticated" }), { status: 401 });
  }

  const { data, error } = await supabase
    .from('user_tts_settings')
    .select<'*', TtsSettings>('*')
    .eq('id', user.id)
    .single();

  if (error) {
    return new Response(JSON.stringify({ message: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify(data), { status: 200 });
}

export async function POST(req: NextRequest) {
  const { tts_service, api_key } = await req.json();

  if (!tts_service || !api_key) {
    return NextResponse.json(
      { message: "TTS service and API key are required" },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: "User not authenticated" }, { status: 401 });
  }

  const userId = user.id;

  const ttsSettings: TtsSettings = {
    id: userId,
    tts_service,
    api_key,
  };

  const { data, error } = await supabase
    .from('user_tts_settings')
    .upsert<TtsSettings>(ttsSettings, { onConflict: "id" });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 200 });
}