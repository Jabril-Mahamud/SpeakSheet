// utils/polly-usage-tracker.ts
import { createClient } from '@/utils/supabase/server';

export interface UsageLimits {
  allowed: boolean;
  currentUsage: number;
  remainingCharacters: number;
  monthlyLimit: number;
}

export class PollyUsageTracker {
  private static readonly MONTHLY_LIMIT = 10000; // 10k characters per month

  static async checkUsageLimits(userId: string, charactersToAdd: number): Promise<UsageLimits> {
    const supabase = await createClient();
    const startOfMonth = new Date(
      new Date().getUTCFullYear(),
      new Date().getUTCMonth(),
      1
    ).toISOString();

    const { data: usage, error } = await supabase
      .from('polly_usage')
      .select('characters_synthesized')
      .eq('user_id', userId)
      .gte('synthesis_date', startOfMonth);

    if (error) {
      throw new Error(`Failed to fetch usage data: ${error.message}`);
    }

    const currentUsage = usage?.reduce(
      (sum, row) => sum + (row.characters_synthesized || 0),
      0
    ) || 0;

    const remainingCharacters = this.MONTHLY_LIMIT - currentUsage;

    return {
      allowed: remainingCharacters >= charactersToAdd,
      currentUsage,
      remainingCharacters,
      monthlyLimit: this.MONTHLY_LIMIT
    };
  }

  static async recordUsage(
    userId: string,
    characters: number,
    voiceId: string
  ): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
      .from('polly_usage')
      .insert({
        user_id: userId,
        characters_synthesized: characters,
        voice_id: voiceId,
        synthesis_date: new Date().toISOString()
      });

    if (error) throw error;
  }
}