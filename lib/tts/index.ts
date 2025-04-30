// lib/tts/index.ts
import { synthesizeWithPolly } from './providers/polly';
import { synthesizeWithElevenLabs } from './providers/elevenlabs';
import { synthesizeWithNeuphonic } from './providers/neuphonic';

export type TTSProvider = 'Amazon' | 'ElevenLabs' | 'Neuphonic';

export type TTSRequest = {
  text: string;
  provider: TTSProvider;
  voiceId: string;
  userId: string;
  options?: Record<string, any>;
};

export async function synthesizeSpeech(request: TTSRequest): Promise<{ audioUrl: string; characters: number }> {
  const { provider, text, voiceId, userId, options } = request;
  
  switch (provider) {
    case 'Amazon':
      return synthesizeWithPolly(text, voiceId, userId, options);
    case 'ElevenLabs':
      return synthesizeWithElevenLabs(text, voiceId, userId, options);
    case 'Neuphonic':
      return synthesizeWithNeuphonic(text, voiceId, userId, options);
    default:
      throw new Error(`Unsupported TTS provider: ${provider}`);
  }
}