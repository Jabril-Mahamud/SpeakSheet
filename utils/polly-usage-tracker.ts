import { createClient } from "@/utils/supabase/server";
import { captureServerEvent } from "@/utils/posthog-server";

interface UserProfile {
  username: string | null;
  full_name: string | null;
}

interface UserWithProfile {
  id: string;
  email: string | null;
  profiles: UserProfile | null;
}
export interface UserUsageStats {
  userId: string;
  email: string | null;
  username: string;
  daily: UsagePeriodStats;
  monthly: UsagePeriodStats;
  yearly: UsagePeriodStats;
}

export interface UsagePeriodStats {
  totalCharacters: number;
  limit: number;
  voiceDistribution: Record<string, number>;
  quotaRemaining: number;
  resetTime: number;
}

export interface PollyUsageRecord {
  id?: number;
  user_id: string;
  characters_synthesized: number;
  voice_id: string;
  synthesis_date: string;
  content_hash?: string;
}

interface DatabaseUser {
  id: string;
  email: string | null;
  profiles:
    | {
        username: string | null;
        full_name: string | null;
      }[]
    | null; // Change to array since Supabase returns it as array
}

export class PollyUsageTracker {
  // Configurable limits
  private static DAILY_CHARACTER_LIMIT = 100_000;
  private static MONTHLY_CHARACTER_LIMIT = 1_000_000;
  private static YEARLY_CHARACTER_LIMIT = 5_000_000;

  // Cache settings
  private static CACHE_DURATION = 60 * 1000; // 1 minute
  private static usageCache = new Map<
    string,
    {
      data: UserUsageStats;
      timestamp: number;
    }
  >();

  /**
   * Check if user is within Polly usage limits with improved caching
   */
  static async checkUsageLimits(userId: string, characterCount: number) {
    const cached = this.usageCache.get(userId);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      const { daily, monthly, yearly } = cached.data;
      return {
        withinLimits:
          daily.quotaRemaining >= characterCount &&
          monthly.quotaRemaining >= characterCount &&
          yearly.quotaRemaining >= characterCount,
        dailyUsage: daily.totalCharacters,
        monthlyUsage: monthly.totalCharacters,
        yearlyUsage: yearly.totalCharacters,
        dailyLimit: this.DAILY_CHARACTER_LIMIT,
        monthlyLimit: this.MONTHLY_CHARACTER_LIMIT,
        yearlyLimit: this.YEARLY_CHARACTER_LIMIT,
      };
    }

    const supabase = await createClient();
    const now = new Date();

    // Define date ranges
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    try {
      // Parallel fetch for better performance
      const [dailyData, monthlyData, yearlyData] = await Promise.all([
        this.fetchUsageForPeriod(supabase, userId, todayStart, now),
        this.fetchUsageForPeriod(supabase, userId, monthStart, now),
        this.fetchUsageForPeriod(supabase, userId, yearStart, now),
      ]);

      const result = {
        withinLimits:
          dailyData.totalCharacters + characterCount <=
            this.DAILY_CHARACTER_LIMIT &&
          monthlyData.totalCharacters + characterCount <=
            this.MONTHLY_CHARACTER_LIMIT &&
          yearlyData.totalCharacters + characterCount <=
            this.YEARLY_CHARACTER_LIMIT,
        dailyUsage: dailyData.totalCharacters,
        monthlyUsage: monthlyData.totalCharacters,
        yearlyUsage: yearlyData.totalCharacters,
        dailyLimit: this.DAILY_CHARACTER_LIMIT,
        monthlyLimit: this.MONTHLY_CHARACTER_LIMIT,
        yearlyLimit: this.YEARLY_CHARACTER_LIMIT,
      };

      return result;
    } catch (error) {
      console.error("Polly usage check error:", error);
      throw error;
    }
  }

  /**
   * Fetch usage data for a specific time period
   */
  private static async fetchUsageForPeriod(
    supabase: any,
    userId: string,
    start: Date,
    end: Date
  ) {
    const { data, error } = await supabase
      .from("polly_usage")
      .select("characters_synthesized, voice_id")
      .eq("user_id", userId)
      .gte("synthesis_date", start.toISOString())
      .lte("synthesis_date", end.toISOString());

    if (error) throw error;

    const totalCharacters = data.reduce(
      (sum: number, record: any) => sum + record.characters_synthesized,
      0
    );

    const voiceDistribution = data.reduce(
      (acc: Record<string, number>, record: any) => {
        acc[record.voice_id] =
          (acc[record.voice_id] || 0) + record.characters_synthesized;
        return acc;
      },
      {}
    );

    return { totalCharacters, voiceDistribution };
  }

  /**
   * Record Polly usage with analytics and caching
   */
  static async recordUsage(
    userId: string,
    characterCount: number,
    voiceId: string,
    textContent?: string
  ): Promise<PollyUsageRecord> {
    const supabase = await createClient();

    const usageRecord: PollyUsageRecord = {
      user_id: userId,
      characters_synthesized: characterCount,
      voice_id: voiceId,
      synthesis_date: new Date().toISOString(),
      content_hash: textContent
        ? await this.hashContent(textContent)
        : undefined,
    };

    // Record in database
    const { data, error } = await supabase
      .from("polly_usage")
      .insert(usageRecord)
      .select()
      .single();

    if (error) {
      console.error("Failed to record Polly usage:", error);
      throw error;
    }

    // Track analytics
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await captureServerEvent("polly_synthesis", user, {
      characters: characterCount,
      voice_id: voiceId,
      content_length: textContent?.length || 0,
    });

    // Invalidate cache
    this.usageCache.delete(userId);

    return data;
  }

  /**
   * Get detailed usage statistics for a user with caching
   */
  static async getUserUsageStats(userId: string): Promise<UserUsageStats> {
    const cached = this.usageCache.get(userId);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    const supabase = await createClient();
    const now = new Date();

    // Prepare date ranges
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    try {
      // Fetch user with profile
      const { data: userData } = await supabase
        .from("users")
        .select("id, email") // Remove profiles join
        .eq("id", userId)
        .single();

      // Parallel fetch periods
      const [daily, monthly, yearly] = await Promise.all([
        this.fetchUsageForPeriod(supabase, userId, todayStart, now),
        this.fetchUsageForPeriod(supabase, userId, monthStart, now),
        this.fetchUsageForPeriod(supabase, userId, yearStart, now),
      ]);

      const user = userData as unknown as DatabaseUser;
      const profile = user?.profiles?.[0];
      const username = userData?.email?.split('@')[0] || userId;
      // Get username with fallback

      const stats: UserUsageStats = {
        userId,
        email: user?.email || null,
        username, // Now properly assigned with fallback
        daily: {
          ...daily,
          limit: this.DAILY_CHARACTER_LIMIT,
          quotaRemaining: Math.max(
            0,
            this.DAILY_CHARACTER_LIMIT - daily.totalCharacters
          ),
          resetTime: todayStart.getTime() + 24 * 60 * 60 * 1000,
        },
        monthly: {
          ...monthly,
          limit: this.MONTHLY_CHARACTER_LIMIT,
          quotaRemaining: Math.max(
            0,
            this.MONTHLY_CHARACTER_LIMIT - monthly.totalCharacters
          ),
          resetTime: monthStart.getTime() + 30 * 24 * 60 * 60 * 1000,
        },
        yearly: {
          ...yearly,
          limit: this.YEARLY_CHARACTER_LIMIT,
          quotaRemaining: Math.max(
            0,
            this.YEARLY_CHARACTER_LIMIT - yearly.totalCharacters
          ),
          resetTime: yearStart.getTime() + 365 * 24 * 60 * 60 * 1000,
        },
      };

      // Update cache
      this.usageCache.set(userId, {
        data: stats,
        timestamp: Date.now(),
      });

      return stats;
    } catch (error) {
      console.error("Failed to get user usage stats:", error);
      throw error;
    }
  }

  /**
   * Get all users' usage statistics with pagination
   */
  static async getAllUsageStats(
    page = 1,
    limit = 100
  ): Promise<{
    stats: UserUsageStats[];
    total: number;
  }> {
    const supabase = await createClient();

    const offset = (page - 1) * limit;

    // Fetch users with pagination and their profiles
    const {
      data: users,
      error: userError,
      count,
    } = await supabase
      .from("users")
      .select("id, email") // Remove profiles join for now
      .range(offset, offset + limit - 1);

    if (userError) {
      console.error("Error fetching users:", userError);
      throw userError;
    }

    // Fetch stats for all users in parallel
    const statsPromises = (users || []).map(async (rawUser) => {
      try {
        const user = rawUser as unknown as DatabaseUser;
        const profile = user?.profiles?.[0];
        const username =
          profile?.username || user?.email?.split("@")[0] || user.id;

        const userStats = await this.getUserUsageStats(user.id);
        return {
          ...userStats,
          userId: user.id,
          email: user.email,
          username,
        };
      } catch (error) {
        console.error(`Failed to get stats for user ${rawUser.id}:`, error);
        return null;
      }
    });

    const results = await Promise.all(statsPromises);

    return {
      stats: results.filter((stat): stat is UserUsageStats => stat !== null),
      total: count || 0,
    };
  }

  /**
   * Hash content for deduplication
   */
  private static async hashContent(content: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  /**
   * Clear usage cache
   */
  static clearCache(userId?: string) {
    if (userId) {
      this.usageCache.delete(userId);
    } else {
      this.usageCache.clear();
    }
  }
}
