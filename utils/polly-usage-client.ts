// utils/polly-usage-client.ts
import { createClient } from '@/utils/supabase/client';

export interface UsageLimits {
  allowed: boolean;
  currentUsage: number;
  remainingCharacters: number;
  monthlyLimit: number;
}

export class PollyUsageClient {
  private static readonly MONTHLY_LIMIT = 10000; // 10k characters per month

  static async checkUsageLimits(userId: string, charactersToAdd: number = 0): Promise<UsageLimits> {
    const supabase = createClient();
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

    // Calculate remaining characters, ensuring it doesn't go negative
    const remainingCharacters = Math.max(0, this.MONTHLY_LIMIT - currentUsage);

    // Check if adding new characters would exceed the limit OR if we're already over the limit
    const isOverLimit = currentUsage >= this.MONTHLY_LIMIT;
    const wouldExceedLimit = (currentUsage + charactersToAdd) > this.MONTHLY_LIMIT;

    return {
      allowed: !isOverLimit && !wouldExceedLimit,
      currentUsage,
      remainingCharacters,
      monthlyLimit: this.MONTHLY_LIMIT
    };
  }
}