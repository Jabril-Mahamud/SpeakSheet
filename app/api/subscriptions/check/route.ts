// app/api/subscription/check/route.ts
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { checkSubscriptionStatus } from '@/lib/subscription';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ subscribed: false }, { status: 401 });
    }
    
    const isSubscribed = await checkSubscriptionStatus(user.id);
    return NextResponse.json({ subscribed: isSubscribed });
  } catch (error) {
    console.error('Subscription check error:', error);
    return NextResponse.json({ error: 'Failed to check subscription' }, { status: 500 });
  }
}