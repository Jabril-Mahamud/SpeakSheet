import { NextRequest, NextResponse } from "next/server";
import { PollyClient, DescribeVoicesCommand } from "@aws-sdk/client-polly";
import { createClient } from "@/utils/supabase/server";
import { captureServerEvent } from "@/utils/posthog-server";

// Initialize the Polly client
const polly = new PollyClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  }
});

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  try {
    if (!user) {
      await captureServerEvent('polly_voices_unauthorized', user, {
        error: 'User not authenticated'
      });
      return NextResponse.json({ message: "User not authenticated" }, { status: 401 });
    }

    await captureServerEvent('polly_voices_fetch_started', user);

    const command = new DescribeVoicesCommand({});
    const response = await polly.send(command);

    // Group voices by language
    const voicesByLanguage = response.Voices?.reduce((acc, voice) => {
      const languageName = voice.LanguageName || 'Other';
      if (!acc[languageName]) {
        acc[languageName] = [];
      }
      
      acc[languageName].push({
        id: voice.Id,
        name: voice.Name,
        gender: voice.Gender,
        languageCode: voice.LanguageCode,
        languageName: voice.LanguageName,
        engine: voice.SupportedEngines
      });
      
      return acc;
    }, {} as Record<string, any[]>) || {};

    await captureServerEvent('polly_voices_fetched', user, {
      languageCount: Object.keys(voicesByLanguage).length,
      totalVoices: response.Voices?.length
    });

    return NextResponse.json(voicesByLanguage);
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