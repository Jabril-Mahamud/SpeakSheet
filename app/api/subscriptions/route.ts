// app/api/subscription/route.ts
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
    
    // Create a Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      billing_address_collection: 'auto',
      customer_email: user.email,
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID, // Monthly subscription price ID
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/protected?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/protected?canceled=true`,
      metadata: {
        userId: user.id,
      },
    });
    
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Subscription error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}