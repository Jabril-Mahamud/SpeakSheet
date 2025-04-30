// app/api/subscription/details/route.ts
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get the latest subscription
    const { data: subscriptionData } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (!subscriptionData) {
      return NextResponse.json({
        status: 'no_subscription',
        plan: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false
      });
    }
    
    // For active subscriptions, get updated information from Stripe
    if (['active', 'trialing', 'past_due'].includes(subscriptionData.status)) {
      try {
        const subscription = await stripe.subscriptions.retrieve(
          subscriptionData.stripe_subscription_id
        );
        
        return NextResponse.json({
          status: subscription.status,
          plan: 'Premium',
          currentPeriodEnd: new Date((subscription as any).current_period_end * 1000).toISOString(),
          cancelAtPeriodEnd: (subscription as any).cancel_at_period_end
        });
      } catch (stripeError) {
        console.error('Error fetching subscription from Stripe:', stripeError);
        // Fall back to database data if Stripe API fails
      }
    }
    
    // Return data from database if Stripe fetch failed or subscription isn't active
    return NextResponse.json({
      status: subscriptionData.status,
      plan: 'Premium',
      currentPeriodEnd: subscriptionData.current_period_end,
      cancelAtPeriodEnd: false
    });
  } catch (error) {
    console.error('Error fetching subscription details:', error);
    return NextResponse.json({ error: 'Failed to fetch subscription details' }, { status: 500 });
  }
}