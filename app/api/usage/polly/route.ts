import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { PollyUsageTracker } from '@/utils/polly-usage-tracker';

// Check if the user is an admin
async function isUserAdmin(userId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single();

  if (error || !data) return false;
  
  return data.role === 'admin';
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  try {
    // Check if user is authenticated
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is an admin
    const isAdmin = await isUserAdmin(user.id);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch users with their usage stats
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, email');

    if (userError || !users) {
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    // Fetch usage stats for each user
    const usageStats = await Promise.all(
      users.map(async (user) => {
        try {
          const stats = await PollyUsageTracker.getUserUsageStats(user.id);
          return {
            userId: user.id,
            email: user.email,
            ...stats
          };
        } catch {
          return null;
        }
      })
    );

    return NextResponse.json(
      usageStats.filter(stat => stat !== null)
    );
  } catch (error) {
    console.error('Polly usage stats error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve usage statistics' },
      { status: 500 }
    );
  }
}