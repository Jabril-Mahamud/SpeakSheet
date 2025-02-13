import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { captureServerEvent } from '@/utils/posthog-server';
import { PollyUsageTracker } from '@/utils/polly-usage-tracker';
import { UserUsageStats } from '@/utils/types';

// Cache expiry in milliseconds (5 minutes)
const CACHE_EXPIRY = 5 * 60 * 1000;
let statsCache: {
  data: any;
  timestamp: number;
} | null = null;

// Check if the user is an admin
async function isUserAdmin(userId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
  
  return data?.role === 'admin';
}

// Validate request parameters
function validateParams(searchParams: URLSearchParams) {
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '100');
  const refresh = searchParams.get('refresh') === 'true';

  return {
    page: isNaN(page) ? 1 : Math.max(1, page),
    limit: isNaN(limit) ? 100 : Math.min(Math.max(1, limit), 100),
    refresh
  };
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  try {
    // Check authentication
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' }, 
        { status: 401 }
      );
    }

    // Check admin status
    const isAdmin = await isUserAdmin(user.id);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' }, 
        { status: 403 }
      );
    }

    // Get and validate query parameters
    const { page, limit, refresh } = validateParams(request.nextUrl.searchParams);

    // Check cache if refresh is not requested
    if (!refresh && statsCache && Date.now() - statsCache.timestamp < CACHE_EXPIRY) {
      return NextResponse.json(statsCache.data);
    }

    // Fetch paginated stats
    const { stats, total } = await PollyUsageTracker.getAllUsageStats(page, limit);

    // Calculate aggregate metrics
    const aggregateStats = {
      totalUsers: total,
      totalCharacters: {
        daily: 0,
        monthly: 0,
        yearly: 0
      },
      averageUsage: {
        daily: 0,
        monthly: 0,
        yearly: 0
      },
      quotaUtilization: {
        daily: 0,
        monthly: 0,
        yearly: 0
      }
    };

    // Calculate aggregates
    stats.forEach(user => {
      ['daily', 'monthly', 'yearly'].forEach(period => {
        const periodKey = period as keyof Pick<UserUsageStats, 'daily' | 'monthly' | 'yearly'>;
        const usage = user[periodKey];
        if (usage && typeof usage !== 'string') {
          aggregateStats.totalCharacters[period as keyof typeof aggregateStats.totalCharacters] += 
            usage.totalCharacters;
        }
      });
    });

    // Calculate averages and utilization
    if (stats.length > 0) {
      ['daily', 'monthly', 'yearly'].forEach(period => {
        const periodKey = period as keyof Pick<UserUsageStats, 'daily' | 'monthly' | 'yearly'>;
        const firstUserPeriod = stats[0][periodKey];
        
        if (firstUserPeriod && typeof firstUserPeriod !== 'string') {
          const total = aggregateStats.totalCharacters[period as keyof typeof aggregateStats.totalCharacters];
          const limit = firstUserPeriod.limit;
          
          aggregateStats.averageUsage[period as keyof typeof aggregateStats.averageUsage] = 
            Math.round(total / stats.length);
          
          aggregateStats.quotaUtilization[period as keyof typeof aggregateStats.quotaUtilization] = 
            Math.round((total / (limit * stats.length)) * 100);
        }
      });
    }

    const response = {
      stats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      aggregateStats
    };

    // Update cache
    statsCache = {
      data: response,
      timestamp: Date.now()
    };

    // Track dashboard access
    await captureServerEvent('admin_dashboard_access', user, {
      page,
      limit,
      totalUsers: total
    });

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching Polly usage stats:', error);
    
    // Clear cache on error
    statsCache = null;

    // Track error
    await captureServerEvent('admin_dashboard_error', user, {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return NextResponse.json(
      { error: 'Failed to retrieve usage statistics' },
      { status: 500 }
    );
  }
}

// Handler for synthesizing text
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { text, voiceId } = body;

    if (!text || !voiceId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Check rate limits
    const usageLimits = await PollyUsageTracker.checkUsageLimits(
      user.id,
      text.length
    );

    if (!usageLimits.withinLimits) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded',
          limits: usageLimits
        },
        { status: 429 }
      );
    }

    // Record usage with analytics
    await PollyUsageTracker.recordUsage(
      user.id,
      text.length,
      voiceId,
      text
    );

    // Return success
    return NextResponse.json({
      success: true,
      charactersUsed: text.length,
      limits: usageLimits
    });

  } catch (error) {
    console.error('Error processing synthesis request:', error);
    
    await captureServerEvent('synthesis_error', user, {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return NextResponse.json(
      { error: 'Failed to process synthesis request' },
      { status: 500 }
    );
  }
}