// app/api/subscription/portal/route.ts
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get the customer ID
    const { data: customerData } = await supabase
      .from('customers')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single();
    
    if (!customerData?.stripe_customer_id) {
      return NextResponse.json({ error: 'No subscription found' }, { status: 404 });
    }
    
    // Create a billing portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: customerData.stripe_customer_id,
      return_url: `${request.headers.get('origin')}/protected`,
    });
    
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Error creating portal session:', error);
    return NextResponse.json({ error: 'Failed to create portal session' }, { status: 500 });
  }
}