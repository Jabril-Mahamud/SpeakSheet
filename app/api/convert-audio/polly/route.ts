// app/api/tts/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { captureServerEvent } from "@/utils/posthog-server";
import { PollyUsageTracker } from "@/utils/polly-usage-tracker";
import {
  PollyClient,
  SynthesizeSpeechCommand,
  VoiceId,
  SynthesizeSpeechCommandInput,
  Engine,
  DescribeVoicesCommand,
} from "@aws-sdk/client-polly";
import { Readable } from "stream";

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

type FreeVoiceId = typeof FREE_VOICES[number];

// Rate limit configuration
const RATE_LIMIT = {
  maxRequests: 100,    // requests
  windowMs: 60 * 1000, // per minute
  endpoint: '/api/tts'
};

// Initialize the Polly client with default credentials
const getPollyClient = (credentials?: { accessKeyId: string; secretAccessKey: string }) => {
  return new PollyClient({
    region: process.env.AWS_REGION || "us-east-1",
    credentials: credentials || {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
};

const chunkText = (text: string, maxLength: number = 2900): string[] => {
  if (text.length <= maxLength) return [text];

  const chunks: string[] = [];
  let currentChunk = "";

  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > maxLength) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = "";
      }
      if (sentence.length > maxLength) {
        const words = sentence.split(" ");
        let tempChunk = "";

        for (const word of words) {
          if ((tempChunk + " " + word).length > maxLength) {
            chunks.push(tempChunk.trim());
            tempChunk = word;
          } else {
            tempChunk += (tempChunk ? " " : "") + word;
          }
        }
        if (tempChunk) {
          currentChunk = tempChunk;
        }
      } else {
        currentChunk = sentence;
      }
    } else {
      currentChunk += sentence;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
};

async function getVoiceEngineSupport(voiceId: string, client: PollyClient): Promise<Engine[]> {
  const command = new DescribeVoicesCommand({
    IncludeAdditionalLanguageCodes: true,
  });

  const response = await client.send(command);
  const voice = response.Voices?.find((v) => v.Id === voiceId);

  return voice?.SupportedEngines || ["standard"];
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  try {
    if (!user) {
      await captureServerEvent("tts_conversion_unauthorized", null, {
        error: "User not authenticated",
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user settings and check for custom credentials
    const { data: settings } = await supabase
      .from("user_tts_settings")
      .select("aws_polly_voice, api_key, tts_service")
      .eq("id", user.id)
      .maybeSingle();

    const { text, voiceId, originalFilename } = await request.json();
    const selectedVoice = voiceId || settings?.aws_polly_voice || "Joanna";
    const hasCustomCreds = Boolean(settings?.api_key);

    // Check if free voice
    const isFreeVoice = FREE_VOICES.includes(selectedVoice as FreeVoiceId);
    if (!hasCustomCreds && !isFreeVoice) {
      await captureServerEvent("tts_conversion_error", user, {
        error: "Premium voice not available",
        voiceId: selectedVoice,
      });
      return NextResponse.json(
        {
          error: "This voice requires custom AWS credentials. Please use a free voice or provide your own AWS credentials.",
          voiceId: selectedVoice,
          availableVoices: FREE_VOICES,
        },
        { status: 403 }
      );
    }

    // Validate input
    if (!text?.trim()) {
      await captureServerEvent("tts_conversion_error", user, {
        error: "Missing text",
        voiceId: selectedVoice,
      });
      return NextResponse.json({ error: "Missing text" }, { status: 400 });
    }

    // Check rate limits for non-custom credential users
    if (!hasCustomCreds) {
      const usageCheck = await PollyUsageTracker.checkUsageLimits(
        user.id,
        text.length
      );
      
      if (!usageCheck.allowed) {
        await captureServerEvent("tts_conversion_error", user, {
          error: "Character limit exceeded",
          currentUsage: usageCheck.currentUsage,
          remainingCharacters: usageCheck.remainingCharacters,
          monthlyLimit: usageCheck.monthlyLimit
        });
        return NextResponse.json(
          {
            error: "Monthly character limit exceeded",
            usageStats: usageCheck,
          },
          { status: 429 }
        );
      }
    }

    // Validate voice ID
    if (!Object.values(VoiceId).includes(selectedVoice as VoiceId)) {
      await captureServerEvent("tts_conversion_error", user, {
        error: "Invalid voice ID",
        voiceId: selectedVoice,
      });
      return NextResponse.json(
        {
          error: "Invalid voice ID. Please use a valid Amazon Polly voice ID.",
          availableVoices: FREE_VOICES,
        },
        { status: 400 }
      );
    }

    // Initialize Polly client with appropriate credentials
    const pollyClient = getPollyClient(
      hasCustomCreds ? {
        accessKeyId: settings!.api_key!,
        secretAccessKey: "CUSTOM_SECRET", // You'd need to implement secure credential storage
      } : undefined
    );

    // Get supported engines
    const supportedEngines = await getVoiceEngineSupport(selectedVoice, pollyClient);
    const engine = supportedEngines.includes("neural") ? "neural" : "standard";

    // Process text in chunks
    const textChunks = chunkText(text);
    const audioChunks: Buffer[] = [];

    for (const chunk of textChunks) {
      const input: SynthesizeSpeechCommandInput = {
        Engine: engine,
        OutputFormat: "mp3",
        Text: chunk,
        VoiceId: selectedVoice as VoiceId,
        TextType: "text",
      };

      const command = new SynthesizeSpeechCommand(input);
      const response = await pollyClient.send(command);

      if (!response.AudioStream) {
        throw new Error("No audio stream returned from AWS Polly");
      }

      const stream = response.AudioStream as unknown as Readable;
      const chunkBuffers: Buffer[] = [];

      await new Promise<void>((resolve, reject) => {
        stream.on("data", (data) => chunkBuffers.push(Buffer.from(data)));
        stream.on("end", () => resolve());
        stream.on("error", reject);
      });

      audioChunks.push(Buffer.concat(chunkBuffers));
    }

    // Combine audio chunks and prepare for storage
    const finalAudioBuffer = Buffer.concat(audioChunks);
    const timestamp = Date.now();
    const fileId = crypto.randomUUID();

    // Generate filename
    const audioFilename = originalFilename
      ? `${originalFilename.replace(/\.[^/.]+$/, "")}_audio.mp3`
      : `audio_${timestamp}_${fileId.slice(0, 8)}.mp3`;

    const fileName = `${user.id}/audio/${fileId}/${audioFilename}`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from("files")
      .upload(fileName, finalAudioBuffer, {
        contentType: "audio/mpeg",
        upsert: true,
      });

    if (uploadError) {
      await captureServerEvent("tts_conversion_error", user, {
        error: `Upload error: ${uploadError.message}`,
        voiceId: selectedVoice,
        stage: "upload",
      });
      throw new Error(`Audio upload error: ${uploadError.message}`);
    }

    // Record in database
    const { data: fileRecord, error: dbError } = await supabase
      .from("files")
      .insert({
        id: fileId,
        user_id: user.id,
        file_path: fileName,
        file_type: "audio/mpeg",
        original_name: audioFilename,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (dbError) {
      await captureServerEvent("tts_conversion_error", user, {
        error: `Database error: ${dbError.message}`,
        voiceId: selectedVoice,
        stage: "database",
      });
      throw new Error(`Database error: ${dbError.message}`);
    }

    // Record usage for non-custom credential users
    if (!hasCustomCreds) {
      await PollyUsageTracker.recordUsage(user.id, text.length, selectedVoice);
    }

    // Log success
    await captureServerEvent("tts_conversion_completed", user, {
      fileId: fileRecord.id,
      textLength: text.length,
      voiceId: selectedVoice,
      chunks: textChunks.length,
      engine: engine,
      usingCustomCredentials: hasCustomCreds,
      isFreeVoice
    });

    return NextResponse.json({
      success: true,
      fileId: fileRecord.id,
      voiceUsed: selectedVoice,
      engine,
      charCount: text.length,
    });

  } catch (error) {
    console.error("[Audio Conversion Error]:", error);

    const errorMessage = error instanceof Error ? error.message : "Conversion failed";
    await captureServerEvent("tts_conversion_error", user, {
      error: errorMessage,
      stage: "unknown",
    });

    return NextResponse.json(
      { 
        error: errorMessage,
        message: "Failed to convert text to speech. Please try again."
      }, 
      { status: 500 }
    );
  }
}