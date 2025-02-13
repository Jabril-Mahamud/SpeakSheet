// app/api/admin/stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    // Get admin status
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userData?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Fetch all stats in parallel
    const [usersResult, filesResult, pollyUsageResult] = await Promise.all([
      // Get users stats
      supabase.from('users').select('*'),
      // Get files stats
      supabase.from('files').select('*'),
      // Get Polly usage stats
      supabase.from('polly_usage').select('*')
    ]);

    // Calculate daily total (last 24 hours)
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    const dailyTotal = pollyUsageResult.data?.reduce((sum, record) => {
      const recordDate = new Date(record.synthesis_date);
      if (recordDate >= oneDayAgo) {
        return sum + record.characters_synthesized;
      }
      return sum;
    }, 0) || 0;

    // Generate usage trends (last 7 days)
    const trends = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dailyChars = pollyUsageResult.data?.reduce((sum, record) => {
        if (record.synthesis_date.startsWith(dateStr)) {
          return sum + record.characters_synthesized;
        }
        return sum;
      }, 0) || 0;

      return {
        date: dateStr,
        characters: dailyChars
      };
    }).reverse();

    // Format user stats
    const users = usersResult.data?.map(user => {
      const userUsage = pollyUsageResult.data?.filter(record => 
        record.user_id === user.id
      ) || [];

      const totalChars = userUsage.reduce((sum, record) => 
        sum + record.characters_synthesized, 0);

      const lastUsage = userUsage.length > 0 
        ? new Date(Math.max(...userUsage.map(r => new Date(r.synthesis_date).getTime())))
        : null;

      return {
        id: user.id,
        email: user.email,
        username: user.email?.split('@')[0] || 'Unknown',
        isActive: Boolean(userUsage.find(r => 
          new Date(r.synthesis_date) >= oneDayAgo
        )),
        charactersUsed: totalChars,
        lastActive: lastUsage?.toISOString() || 'Never'
      };
    }) || [];

    // Calculate success rate from files
    const totalFiles = filesResult.data?.length || 0;
    const completedFiles = filesResult.data?.filter(f => 
      f.conversion_status === 'completed'
    ).length || 0;
    const successRate = totalFiles > 0 
      ? Math.round((completedFiles / totalFiles) * 100) 
      : 0;

    return NextResponse.json({
      totalUsers: usersResult.data?.length || 0,
      dailyTotal,
      trends,
      users,
      totalFiles,
      successRate
    });

  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics' }, 
      { status: 500 }
    );
  }
}