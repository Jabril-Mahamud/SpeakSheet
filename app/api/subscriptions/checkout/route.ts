// app/api/subscriptions/checkout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import stripe from '@/utils/stripe/server';
import { headers } from 'next/headers';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  
  // Check authentication
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const { tierId } = await request.json();
    
    if (!tierId) {
      return NextResponse.json({ error: 'Tier ID is required' }, { status: 400 });
    }
    
    // Get the subscription tier
    const { data: tier, error: tierError } = await supabase
      .from('subscription_tiers')
      .select('*')
      .eq('id', tierId)
      .single();
    
    if (tierError || !tier) {
      return NextResponse.json(
        { error: 'Invalid subscription tier' },
        { status: 400 }
      );
    }
    
    // Check if user already has a Stripe customer ID
    const { data: existingCustomer, error: customerError } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .not('stripe_customer_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    let customerId = existingCustomer?.stripe_customer_id;
    
    // If user doesn't have a Stripe customer ID, create one
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          userId: user.id
        }
      });
      
      customerId = customer.id;
    }
    
    // Get the origin for success/cancel URLs
    const headersList = headers();
    const origin = headersList.get('origin') || 'http://localhost:3000';
    
    // Create a Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `SheetSpeak ${tier.name} Plan`,
              description: tier.description,
            },
            unit_amount: tier.monthly_price,
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId: user.id,
        tierId: tier.id,
      },
      mode: 'subscription',
      success_url: `${origin}/protected/subscription?success=true`,
      cancel_url: `${origin}/protected/subscription?canceled=true`,
    });
    
    // Return the checkout URL
    return NextResponse.json({ 
      checkoutUrl: session.url,
      sessionId: session.id 
    });
    
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}