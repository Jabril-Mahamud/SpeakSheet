// utils/polly-usage-tracker.ts
import { createClient } from '@/utils/supabase/server';

export interface UsageLimits {
  withinLimits: boolean;
  dailyUsage: number;
  monthlyUsage: number;
  yearlyUsage: number;
  dailyLimit: number;
  monthlyLimit: number;
  yearlyLimit: number;
}

export class PollyUsageTracker {
  private static readonly DEFAULT_LIMITS = {
    daily: 10000,    // 10k characters per day
    monthly: 100000, // 100k characters per month
    yearly: 1000000  // 1M characters per year
  };

  static async checkUsageLimits(userId: string, charactersToAdd: number): Promise<UsageLimits> {
    const supabase = await createClient();
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString();

    // Get current usage
    const [dailyStats, monthlyStats, yearlyStats] = await Promise.all([
      supabase
        .from('polly_usage')
        .select('characters_synthesized')
        .eq('user_id', userId)
        .gte('synthesis_date', startOfDay),
      supabase
        .from('polly_usage')
        .select('characters_synthesized')
        .eq('user_id', userId)
        .gte('synthesis_date', startOfMonth),
      supabase
        .from('polly_usage')
        .select('characters_synthesized')
        .eq('user_id', userId)
        .gte('synthesis_date', startOfYear)
    ]);

    const dailyUsage = dailyStats.data?.reduce((sum, row) => sum + row.characters_synthesized, 0) || 0;
    const monthlyUsage = monthlyStats.data?.reduce((sum, row) => sum + row.characters_synthesized, 0) || 0;
    const yearlyUsage = yearlyStats.data?.reduce((sum, row) => sum + row.characters_synthesized, 0) || 0;

    return {
      withinLimits: 
        (dailyUsage + charactersToAdd) <= this.DEFAULT_LIMITS.daily &&
        (monthlyUsage + charactersToAdd) <= this.DEFAULT_LIMITS.monthly &&
        (yearlyUsage + charactersToAdd) <= this.DEFAULT_LIMITS.yearly,
      dailyUsage,
      monthlyUsage,
      yearlyUsage,
      dailyLimit: this.DEFAULT_LIMITS.daily,
      monthlyLimit: this.DEFAULT_LIMITS.monthly,
      yearlyLimit: this.DEFAULT_LIMITS.yearly
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