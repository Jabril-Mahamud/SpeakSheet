import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { captureServerEvent } from "@/utils/posthog-server";

// ElevenLabs has a maximum text length of 2500 characters per request
const MAX_CHUNK_LENGTH = 2500;
const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // Rachel voice

const chunkText = (
  text: string,
  maxLength: number = MAX_CHUNK_LENGTH
): string[] => {
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

async function synthesizeWithElevenLabs(
  text: string,
  voiceId: string,
  apiKey: string,
  stability: number = 0.5,
  similarityBoost: number = 0.75
): Promise<ArrayBuffer> {
  console.log("Sending request to ElevenLabs with:", {
    voiceId,
    textLength: text.length,
    stability,
    similarityBoost,
  });

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
    {
      method: "POST",
      headers: {
        Accept: "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: stability,
          similarity_boost: similarityBoost,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ detail: "Unknown error" }));
    console.error("ElevenLabs API Error Response:", errorData);
    throw new Error(
      `ElevenLabs API error: ${errorData.detail || response.statusText}`
    );
  }

  const audioData = await response.arrayBuffer();
  if (!audioData || audioData.byteLength === 0) {
    throw new Error("No audio data received from ElevenLabs");
  }

  return audioData;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  try {
    if (!user) {
      await captureServerEvent("tts_conversion_unauthorized", user, {
        error: "User not authenticated",
        service: "elevenlabs",
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: settings } = await supabase
      .from("user_tts_settings")
      .select(
        "api_key, elevenlabs_voice_id, elevenlabs_stability, elevenlabs_similarity_boost"
      )
      .eq("id", user.id)
      .maybeSingle();

    if (!settings?.api_key) {
      await captureServerEvent("tts_conversion_error", user, {
        error: "API key not configured",
        service: "elevenlabs",
      });
      return NextResponse.json(
        {
          error: "API key not configured. Please add your API key in settings.",
        },
        { status: 400 }
      );
    }

    const { text, voiceId, originalFilename, stability, similarityBoost } =
      await request.json();

    // Use voice ID from request, settings, or default to Rachel
    const effectiveVoiceId =
      voiceId || settings.elevenlabs_voice_id || DEFAULT_VOICE_ID;

    if (!text) {
      await captureServerEvent("tts_conversion_error", user, {
        error: "Missing text",
        service: "elevenlabs",
      });
      return NextResponse.json({ error: "Missing text" }, { status: 400 });
    }

    await captureServerEvent("tts_conversion_started", user, {
      textLength: text?.length,
      voiceId: effectiveVoiceId,
      hasOriginalFilename: !!originalFilename,
      service: "elevenlabs",
    });

    const textChunks = chunkText(text);
    const audioChunks: ArrayBuffer[] = [];

    for (const chunk of textChunks) {
      const audioBuffer = await synthesizeWithElevenLabs(
        chunk,
        effectiveVoiceId,
        settings.api_key,
        stability || settings.elevenlabs_stability || 0.5,
        similarityBoost || settings.elevenlabs_similarity_boost || 0.75
      );
      audioChunks.push(audioBuffer);
    }

    // Combine all audio chunks
    const finalAudioBuffer = Buffer.concat(
      audioChunks.map((chunk) => Buffer.from(chunk))
    );

    const timestamp = Date.now();
    const fileId = crypto.randomUUID();

    const audioFilename = originalFilename
      ? `${originalFilename.replace(/\.[^/.]+$/, "")}_audio.mp3`
      : `audio_${timestamp}_${fileId.slice(0, 8)}.mp3`;

    const fileName = `${user.id}/audio/${fileId}/${audioFilename}`;

    const { error: uploadError } = await supabase.storage
      .from("files")
      .upload(fileName, finalAudioBuffer, {
        contentType: "audio/mpeg",
        upsert: true,
      });

    if (uploadError) {
      await captureServerEvent("tts_conversion_error", user, {
        error: `Upload error: ${uploadError.message}`,
        voiceId: effectiveVoiceId,
        stage: "upload",
        service: "elevenlabs",
      });
      throw new Error(`Audio upload error: ${uploadError.message}`);
    }

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
        voiceId: effectiveVoiceId,
        stage: "database",
        service: "elevenlabs",
      });
      throw new Error(`Database error: ${dbError.message}`);
    }

    await captureServerEvent("tts_conversion_completed", user, {
      fileId: fileRecord.id,
      textLength: text.length,
      voiceId: effectiveVoiceId,
      chunks: textChunks.length,
      service: "elevenlabs",
    });

    return NextResponse.json({
      success: true,
      fileId: fileRecord.id,
    });
  } catch (error) {
    console.error("[ElevenLabs Conversion Error]:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Conversion failed";
    await captureServerEvent("tts_conversion_error", user, {
      error: errorMessage,
      stage: "unknown",
      service: "elevenlabs",
    });

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
