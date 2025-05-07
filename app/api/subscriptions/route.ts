// app/api/subscriptions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import stripe from '@/utils/stripe/server';

// GET: Fetch current user's subscription
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  
  // Check authentication
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    // Get the user's current subscription
    const { data: subscription, error: subscriptionError } = await supabase
      .from('subscriptions')
      .select(`
        id, 
        status, 
        current_period_start, 
        current_period_end, 
        cancel_at_period_end,
        subscription_tiers (
          id, 
          name, 
          monthly_price, 
          character_limit, 
          description, 
          features
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (subscriptionError && subscriptionError.code !== 'PGRST116') { // PGRST116 is returned when no rows found
      throw subscriptionError;
    }

    // Check if no subscription found, return all subscription tiers
    if (!subscription) {
      const { data: tiers, error: tiersError } = await supabase
        .from('subscription_tiers')
        .select('*')
        .order('monthly_price', { ascending: true });
      
      if (tiersError) {
        throw tiersError;
      }
      
      // Get usage info
      const { data: usageData } = await supabase.rpc('get_monthly_character_usage', {
        user_id_param: user.id
      });
      
      const usage = {
        current: usageData || 0,
        limit: 1000, // Free tier limit
        remaining: Math.max(0, 1000 - (usageData || 0))
      };
      
      return NextResponse.json({ 
        subscription: null, 
        tiers,
        usage
      });
    }
    
    // Get usage info
    const { data: usageData } = await supabase.rpc('get_monthly_character_usage', {
      user_id_param: user.id
    });
    
    const usage = {
      current: usageData || 0,
      limit: subscription.subscription_tiers.character_limit,
      remaining: Math.max(0, subscription.subscription_tiers.character_limit - (usageData || 0))
    };
    
    return NextResponse.json({ subscription, usage });
    
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription information' },
      { status: 500 }
    );
  }
}