// app/api/usage/route.ts
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get usage data from database function
    const { data: usageData, error } = await supabase.rpc('get_monthly_character_usage', {
      user_id_param: user.id
    });
    
    if (error) {
      console.error('Error fetching usage data:', error);
      return NextResponse.json({ error: 'Failed to fetch usage data' }, { status: 500 });
    }
    
    return NextResponse.json({ characters: usageData || 0 });
  } catch (error) {
    console.error('Error fetching usage data:', error);
    return NextResponse.json({ error: 'Failed to fetch usage data' }, { status: 500 });
  }
}