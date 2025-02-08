import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { captureServerEvent } from "@/utils/posthog-server";
import {
  PollyClient,
  SynthesizeSpeechCommand,
  VoiceId,
  SynthesizeSpeechCommandInput,
  Engine,
  DescribeVoicesCommand
} from "@aws-sdk/client-polly";
import { Readable } from "stream";

const pollyClient = new PollyClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

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

async function getVoiceEngineSupport(voiceId: string): Promise<Engine[]> {
  const command = new DescribeVoicesCommand({
    IncludeAdditionalLanguageCodes: true,
  });
  
  const response = await pollyClient.send(command);
  const voice = response.Voices?.find(v => v.Id === voiceId);
  
  return voice?.SupportedEngines || ['standard'];
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  try {
    if (!user) {
      await captureServerEvent('tts_conversion_unauthorized', user, {
        error: 'User not authenticated'
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: settings } = await supabase
      .from('user_tts_settings')
      .select('aws_polly_voice')
      .eq('id', user.id)
      .maybeSingle();

    const { text, voiceId, originalFilename } = await request.json();
    const selectedVoice = voiceId || settings?.aws_polly_voice || 'Joanna';
   
    await captureServerEvent('tts_conversion_started', user, {
      textLength: text?.length,
      voiceId: selectedVoice,
      hasOriginalFilename: !!originalFilename
    });

    if (!text) {
      await captureServerEvent('tts_conversion_error', user, {
        error: 'Missing text',
        voiceId: selectedVoice
      });
      return NextResponse.json({ error: 'Missing text' }, { status: 400 })
    }

    if (!Object.values(VoiceId).includes(selectedVoice as VoiceId)) {
      await captureServerEvent('tts_conversion_error', user, {
        error: 'Invalid voice ID',
        voiceId: selectedVoice
      });
      return NextResponse.json({ 
        error: `Invalid voice ID. Please use a valid Amazon Polly voice ID.`
      }, { status: 400 })
    }

    // Get supported engines for the selected voice
    const supportedEngines = await getVoiceEngineSupport(selectedVoice);
    const engine = supportedEngines.includes('neural') ? 'neural' : 'standard';

    console.log(`Making AWS Polly request with voiceId: ${selectedVoice}, engine: ${engine}`);

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

    const finalAudioBuffer = Buffer.concat(audioChunks);
    const timestamp = Date.now();
    const fileId = crypto.randomUUID();
    
    // Generate the audio filename based on the original file
    const audioFilename = originalFilename 
      ? `${originalFilename.replace(/\.[^/.]+$/, '')}_audio.mp3` // Remove original extension and add _audio.mp3
      : `audio_${timestamp}_${fileId.slice(0, 8)}.mp3`; // Fallback to timestamp-based name
    
    const fileName = `${user.id}/audio/${fileId}/${audioFilename}`;

    const { error: uploadError } = await supabase.storage
      .from("files")
      .upload(fileName, finalAudioBuffer, {
        contentType: "audio/mpeg",
        upsert: true,
      });

    if (uploadError) {
      await captureServerEvent('tts_conversion_error', user, {
        error: `Upload error: ${uploadError.message}`,
        voiceId: selectedVoice,
        stage: 'upload'
      });
      console.error("Upload error:", uploadError);
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
      await captureServerEvent('tts_conversion_error', user, {
        error: `Database error: ${dbError.message}`,
        voiceId: selectedVoice,
        stage: 'database'
      });
      throw new Error(`Database error: ${dbError.message}`);
    }

    await captureServerEvent('tts_conversion_completed', user, {
      fileId: fileRecord.id,
      textLength: text.length,
      voiceId: selectedVoice,
      chunks: textChunks.length,
      engine: engine
    });

    return NextResponse.json({
      success: true,
      fileId: fileRecord.id,
    });
  } catch (error) {
    console.error("[Audio Conversion Error]:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Conversion failed";
    await captureServerEvent('tts_conversion_error', user, {
      error: errorMessage,
      stage: 'unknown'
    });

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}