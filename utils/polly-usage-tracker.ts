import { createClient } from '@/utils/supabase/server';

export interface UserUsageStats {
  userId: string;
  email: string | null;
  daily: {
    totalCharacters: number;
    limit: number;
    voiceDistribution: Record<string, number>;
  };
  monthly: {
    totalCharacters: number;
    limit: number;
    voiceDistribution: Record<string, number>;
  };
  yearly: {
    totalCharacters: number;
    limit: number;
    voiceDistribution: Record<string, number>;
  };
}

export interface PollyUsageRecord {
  id?: number;
  user_id: string;
  characters_synthesized: number;
  voice_id: string;
  synthesis_date: string;
}

export class PollyUsageTracker {
  // Configurable usage limits
  private static DAILY_CHARACTER_LIMIT = 100_000;
  private static MONTHLY_CHARACTER_LIMIT = 1_000_000;
  private static YEARLY_CHARACTER_LIMIT = 5_000_000;

  /**
   * Check if user is within Polly usage limits
   */
  static async checkUsageLimits(userId: string, characterCount: number) {
    const supabase = await createClient();
    const now = new Date();

    // Define date ranges
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    try {
      // Fetch usage data
      const { data: dailyData, error: dailyError } = await supabase
        .from('polly_usage')
        .select('characters_synthesized')
        .eq('user_id', userId)
        .gte('synthesis_date', todayStart.toISOString())
        .lte('synthesis_date', now.toISOString());

      const { data: monthlyData, error: monthlyError } = await supabase
        .from('polly_usage')
        .select('characters_synthesized')
        .eq('user_id', userId)
        .gte('synthesis_date', monthStart.toISOString())
        .lte('synthesis_date', now.toISOString());

      const { data: yearlyData, error: yearlyError } = await supabase
        .from('polly_usage')
        .select('characters_synthesized')
        .eq('user_id', userId)
        .gte('synthesis_date', yearStart.toISOString())
        .lte('synthesis_date', now.toISOString());

      // Validate data retrieval
      if (dailyError || monthlyError || yearlyError) {
        throw new Error('Failed to retrieve usage data');
      }

      // Calculate total usage
      const dailyUsage = dailyData.reduce((sum, record) => sum + record.characters_synthesized, 0);
      const monthlyUsage = monthlyData.reduce((sum, record) => sum + record.characters_synthesized, 0);
      const yearlyUsage = yearlyData.reduce((sum, record) => sum + record.characters_synthesized, 0);

      // Check if within limits
      const withinLimits = 
        dailyUsage + characterCount <= this.DAILY_CHARACTER_LIMIT &&
        monthlyUsage + characterCount <= this.MONTHLY_CHARACTER_LIMIT &&
        yearlyUsage + characterCount <= this.YEARLY_CHARACTER_LIMIT;

      return {
        withinLimits,
        dailyUsage,
        monthlyUsage,
        yearlyUsage,
        dailyLimit: this.DAILY_CHARACTER_LIMIT,
        monthlyLimit: this.MONTHLY_CHARACTER_LIMIT,
        yearlyLimit: this.YEARLY_CHARACTER_LIMIT
      };
    } catch (error) {
      console.error('Polly usage check error:', error);
      throw error;
    }
  }

  /**
   * Record Polly usage in the database
   */
  static async recordUsage(
    userId: string, 
    characterCount: number, 
    voiceId: string
  ): Promise<PollyUsageRecord> {
    const supabase = await createClient();

    const usageRecord: PollyUsageRecord = {
      user_id: userId,
      characters_synthesized: characterCount,
      voice_id: voiceId,
      synthesis_date: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('polly_usage')
      .insert(usageRecord)
      .select()
      .single();

    if (error) {
      console.error('Failed to record Polly usage:', error);
      throw error;
    }

    return data;
  }

  /**
   * Get detailed usage statistics for a user
   */
  static async getUserUsageStats(userId: string) {
    const supabase = await createClient();
    const now = new Date();

    // Prepare date ranges
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    try {
      // Fetch usage data
      const { data: dailyData, error: dailyError } = await supabase
        .from('polly_usage')
        .select('characters_synthesized, voice_id')
        .eq('user_id', userId)
        .gte('synthesis_date', todayStart.toISOString())
        .lte('synthesis_date', now.toISOString());

      const { data: monthlyData, error: monthlyError } = await supabase
        .from('polly_usage')
        .select('characters_synthesized, voice_id')
        .eq('user_id', userId)
        .gte('synthesis_date', monthStart.toISOString())
        .lte('synthesis_date', now.toISOString());

      const { data: yearlyData, error: yearlyError } = await supabase
        .from('polly_usage')
        .select('characters_synthesized, voice_id')
        .eq('user_id', userId)
        .gte('synthesis_date', yearStart.toISOString())
        .lte('synthesis_date', now.toISOString());

      if (dailyError || monthlyError || yearlyError) {
        throw new Error('Failed to retrieve usage statistics');
      }

      // Calculate usage statistics
      const calculateStats = (data: any[]) => ({
        totalCharacters: data.reduce((sum, record) => sum + record.characters_synthesized, 0),
        voiceDistribution: data.reduce((acc, record) => {
          acc[record.voice_id] = (acc[record.voice_id] || 0) + record.characters_synthesized;
          return acc;
        }, {})
      });

      return {
        daily: {
          ...calculateStats(dailyData),
          limit: this.DAILY_CHARACTER_LIMIT
        },
        monthly: {
          ...calculateStats(monthlyData),
          limit: this.MONTHLY_CHARACTER_LIMIT
        },
        yearly: {
          ...calculateStats(yearlyData),
          limit: this.YEARLY_CHARACTER_LIMIT
        }
      };
    } catch (error) {
      console.error('Failed to get user usage stats:', error);
      throw error;
    }
  }

  static async getAllUsageStats(): Promise<UserUsageStats[]> {
    const supabase = await createClient();
    
    // Fetch user IDs from the users table
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id')
      .limit(100);
  
    // If there's an error or no users, return an empty array instead of throwing
    if (userError) {
      console.error('Error fetching users:', userError);
      return [];
    }
  
    if (!users || users.length === 0) {
      console.warn('No users found');
      return [];
    }
  
    const usageStats: UserUsageStats[] = [];
  
    for (const user of users) {
      try {
        // Try to get auth user to potentially fetch email
        const { data: authUser } = await supabase.auth.getUser(user.id);
        
        const stats = await this.getUserUsageStats(user.id);
        usageStats.push({
          userId: user.id,
          email: authUser?.user?.email || null,
          daily: stats.daily,
          monthly: stats.monthly,
          yearly: stats.yearly
        });
      } catch (error) {
        console.error(`Failed to get stats for user ${user.id}:`, error);
        // Continue processing other users even if one fails
        continue;
      }
    }
  
    return usageStats;
  }
}