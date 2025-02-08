import { NextRequest, NextResponse } from "next/server";
import { PollyClient, DescribeVoicesCommand } from "@aws-sdk/client-polly";

// Initialize the Polly client
const polly = new PollyClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  }
});

export async function GET(request: NextRequest) {
  try {
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

    return NextResponse.json(voicesByLanguage);
  } catch (error) {
    console.error('Error fetching voices:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to fetch voices" },
      { status: 500 }
    );
  }
}