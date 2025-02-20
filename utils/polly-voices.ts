// utils/polly-voices.ts
import { VoiceId } from "@aws-sdk/client-polly";
import { createClient } from "./supabase/server";

// List of free standard voices
export const FREE_VOICES = [
  'Joanna',
  'Matthew',
  'Salli',
  'Justin',
  'Joey',
  'Kendra',
  'Kimberly',
  'Kevin'
] as const;

export type FreeVoiceId = typeof FREE_VOICES[number];

// Helper to check if a voice ID is in the free list
export function isFreeVoice(voiceId: string): voiceId is FreeVoiceId {
  return FREE_VOICES.includes(voiceId as FreeVoiceId);
}

// Helper to check if user is using custom AWS credentials
export async function hasCustomCredentials(userId: string) {
  const supabase = await createClient();
  
  const { data } = await supabase
    .from('user_tts_settings')
    .select('api_key')
    .eq('id', userId)
    .single();

  return Boolean(data?.api_key);
}

// Helper to filter voices based on user access
export function filterVoicesByAccess(
  voices: Array<any>,
  hasCustomCreds: boolean
): Array<any> {
  if (hasCustomCreds) {
    return voices; // Return all voices if user has custom credentials
  }
  
  // Otherwise only return free voices
  return voices.filter(voice => isFreeVoice(voice.Id));
}

// Helper to check if user can use a specific voice
export async function canUseVoice(
  userId: string, 
  voiceId: string
): Promise<boolean> {
  // If it's a free voice, always allow
  if (isFreeVoice(voiceId)) {
    return true;
  }
  
  // Otherwise, check if user has custom credentials
  return await hasCustomCredentials(userId);
}