import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { captureServerEvent } from "@/utils/posthog-server";

const DEFAULT_LANG_CODE = "en";
const DEFAULT_MODEL = "neu_hq";

// Function to synthesize speech using Neuphonic HTTP API
// Complete revised version of the synthesizeWithNeuphonic function
// Original implementation that was working correctly
async function synthesizeWithNeuphonic(
  text: string,
  apiKey: string,
  langCode: string = DEFAULT_LANG_CODE,
  voiceId?: string,
  model: string = DEFAULT_MODEL
): Promise<Buffer> {
  console.log("Starting Neuphonic synthesis with HTTP API:", {
    langCode,
    model,
    hasVoiceId: !!voiceId,
    textLength: text.length,
  });

  // Prepare request payload
  const payload: any = {
    text,
    model,
  };

  // Add voice_id if provided and not empty
  if (voiceId && voiceId.trim()) {
    payload.voice_id = voiceId;
  }

  try {
    console.log(`Sending request to Neuphonic API for language: ${langCode}`);
    console.log("Request payload:", JSON.stringify(payload));

    // Make HTTP request to Neuphonic API
    const response = await fetch(
      `https://eu-west-1.api.neuphonic.com/sse/speak/${langCode}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": apiKey,
          Accept: "text/event-stream", // Original setting
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      let errorMessage;
      try {
        // Try to parse error response as JSON
        const errorData = await response.json();
        errorMessage =
          errorData.message || errorData.error || response.statusText;
      } catch {
        // If not JSON, get as text
        errorMessage = await response.text();
        if (!errorMessage) {
          errorMessage = `HTTP error ${response.status}: ${response.statusText}`;
        }
      }
      console.error(`Neuphonic API error (${response.status}):`, errorMessage);
      throw new Error(`Neuphonic API error: ${errorMessage}`);
    }

    // Get binary audio data
    const audioBuffer = await response.arrayBuffer();
    console.log(`Received ${audioBuffer.byteLength} bytes of audio data`);

    if (audioBuffer.byteLength === 0) {
      throw new Error("No audio data received from Neuphonic");
    }

    return Buffer.from(audioBuffer);
  } catch (error) {
    console.error("Error in Neuphonic synthesis:", error);
    throw error;
  }
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
        service: "neuphonic",
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const requestData = await request.json();
    const {
      text,
      voiceId,
      originalFilename,
      apiKey: requestApiKey,
      langCode: requestLangCode,
      model: requestModel,
    } = requestData;

    console.log("Request parameters:", {
      textLength: text?.length,
      hasVoiceId: !!voiceId,
      hasApiKey: !!requestApiKey,
      hasLangCode: !!requestLangCode,
      hasModel: !!requestModel,
      originalFilename,
    });

    // Get user settings
    const { data: settings } = await supabase
      .from("user_tts_settings")
      .select(
        "api_key, neuphonic_voice_id, neuphonic_lang_code, neuphonic_model"
      )
      .eq("id", user.id)
      .maybeSingle();

    // Get effective parameters (request params take precedence over settings)
    const effectiveApiKey = requestApiKey || settings?.api_key;
    const effectiveVoiceId = voiceId || settings?.neuphonic_voice_id || "";
    const effectiveLangCode =
      requestLangCode || settings?.neuphonic_lang_code || DEFAULT_LANG_CODE;
    const effectiveModel =
      requestModel || settings?.neuphonic_model || DEFAULT_MODEL;

    // Validate required parameters
    if (!effectiveApiKey) {
      await captureServerEvent("tts_conversion_error", user, {
        error: "API key not configured",
        service: "neuphonic",
      });
      return NextResponse.json(
        {
          error: "API key not configured. Please add your API key in settings.",
        },
        { status: 400 }
      );
    }

    if (!text) {
      await captureServerEvent("tts_conversion_error", user, {
        error: "Missing text",
        service: "neuphonic",
      });
      return NextResponse.json({ error: "Missing text" }, { status: 400 });
    }

    await captureServerEvent("tts_conversion_started", user, {
      textLength: text.length,
      voiceId: effectiveVoiceId || "default",
      langCode: effectiveLangCode,
      model: effectiveModel,
      hasOriginalFilename: !!originalFilename,
      service: "neuphonic",
    });

    // Convert text to speech using Neuphonic HTTP API
    const audioBuffer = await synthesizeWithNeuphonic(
      text,
      effectiveApiKey,
      effectiveLangCode,
      effectiveVoiceId,
      effectiveModel
    );

    // Generate file details
    const timestamp = Date.now();
    const fileId = crypto.randomUUID();
    const audioFilename = originalFilename
      ? `${originalFilename.replace(/\.[^/.]+$/, "")}_audio.mp3`
      : `audio_${timestamp}_${fileId.slice(0, 8)}.mp3`;
    const fileName = `${user.id}/audio/${fileId}/${audioFilename}`;

    console.log(
      `Uploading ${audioBuffer.length} bytes to Supabase storage as ${fileName}`
    );

    // Upload to Supabase storage
    const { error: uploadError } = await supabase.storage
      .from("files")
      .upload(fileName, audioBuffer, {
        contentType: "audio/mpeg",
        upsert: true,
      });

    if (uploadError) {
      await captureServerEvent("tts_conversion_error", user, {
        error: `Upload error: ${uploadError.message}`,
        voiceId: effectiveVoiceId,
        stage: "upload",
        service: "neuphonic",
      });
      throw new Error(`Audio upload error: ${uploadError.message}`);
    }

    // Record file in database
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
        service: "neuphonic",
      });
      throw new Error(`Database error: ${dbError.message}`);
    }

    // Log successful conversion
    await captureServerEvent("tts_conversion_completed", user, {
      fileId: fileRecord.id,
      textLength: text.length,
      voiceId: effectiveVoiceId || "default",
      langCode: effectiveLangCode,
      model: effectiveModel,
      audioSize: audioBuffer.length,
      service: "neuphonic",
    });

    return NextResponse.json({
      success: true,
      fileId: fileRecord.id,
    });
  } catch (error) {
    console.error("[Neuphonic Conversion Error]:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Conversion failed";
    await captureServerEvent("tts_conversion_error", user, {
      error: errorMessage,
      stage: "unknown",
      service: "neuphonic",
    });

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
