// app/api/voices/polly/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PollyClient, DescribeVoicesCommand } from "@aws-sdk/client-polly";
import { createClient } from "@/utils/supabase/server";
import { captureServerEvent } from "@/utils/posthog-server";

// Define free voices
const FREE_VOICES = [
  'Joanna',
  'Matthew',
  'Salli',
  'Justin',
  'Joey',
  'Kendra',
  'Kimberly',
  'Kevin'
] as const;

// Initialize the Polly client with default credentials
const getPollyClient = (credentials?: { accessKeyId: string; secretAccessKey: string }) => {
  return new PollyClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: credentials || {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
    },
  });
};

async function hasCustomCredentials(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('user_tts_settings')
    .select('api_key')
    .eq('id', userId)
    .single();

  return Boolean(data?.api_key);
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  try {
    if (!user) {
      await captureServerEvent('polly_voices_unauthorized', null, {
        error: 'User not authenticated'
      });
      return NextResponse.json({ message: "User not authenticated" }, { status: 401 });
    }

    await captureServerEvent('polly_voices_fetch_started', user);

    // Check if user has custom credentials
    const hasCustomCreds = await hasCustomCredentials(user.id);

    // Get client with appropriate credentials
    const pollyClient = getPollyClient();
    const command = new DescribeVoicesCommand({});
    const response = await pollyClient.send(command);

    // Group voices by language and mark free/premium status
    const voicesByLanguage = response.Voices?.reduce((acc, voice) => {
      const languageName = voice.LanguageName || 'Other';
      if (!acc[languageName]) {
        acc[languageName] = [];
      }

      const isFree = FREE_VOICES.includes(voice.Id as any);
      
      // Only include premium voices if user has custom credentials
      if (!hasCustomCreds && !isFree) {
        return acc;
      }

      acc[languageName].push({
        id: voice.Id,
        name: voice.Name,
        gender: voice.Gender,
        languageCode: voice.LanguageCode,
        languageName: voice.LanguageName,
        engine: voice.SupportedEngines,
        isFree,
        isNeural: voice.SupportedEngines?.includes('neural')
      });
      
      return acc;
    }, {} as Record<string, any[]>) || {};

    await captureServerEvent('polly_voices_fetched', user, {
      languageCount: Object.keys(voicesByLanguage).length,
      totalVoices: Object.values(voicesByLanguage).flat().length,
      hasCustomCredentials: hasCustomCreds
    });

    return NextResponse.json({
      voices: voicesByLanguage,
      hasCustomCredentials: hasCustomCreds,
      defaultVoice: process.env.NEXT_PUBLIC_AWS_POLLY_VOICE || "Joanna"
    });

  } catch (error) {
    console.error('Error fetching voices:', error);
    
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch voices";
    
    await captureServerEvent('polly_voices_error', user, {
      error: errorMessage
    });

    return NextResponse.json(
      { message: errorMessage },
      { status: 500 }
    );
  }
}