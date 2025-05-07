// app/api/webhooks/stripe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import stripe from '@/utils/stripe/server';
import { headers } from 'next/headers';

// This handler processes webhooks from Stripe
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  
  // Get the webhook secret from environment variables
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('Missing STRIPE_WEBHOOK_SECRET');
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    );
  }
  
  try {
    // Get the signature from the headers
    const headersList = headers();
    const signature = headersList.get('stripe-signature');
    
    if (!signature) {
      return NextResponse.json(
        { error: 'No signature provided' },
        { status: 400 }
      );
    }
    
    // Get the raw body for validation
    const body = await request.text();
    
    // Verify the webhook signature
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret
    );
    
    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        
        // Extract metadata
        const userId = session.metadata?.userId;
        const tierId = session.metadata?.tierId;
        
        if (!userId || !tierId) {
          console.error('Missing metadata in session:', session.id);
          return NextResponse.json(
            { error: 'Missing metadata in session' },
            { status: 400 }
          );
        }
        
        // Get the subscription ID
        const subscriptionId = session.subscription;
        
        if (!subscriptionId) {
          console.error('No subscription ID in session:', session.id);
          return NextResponse.json(
            { error: 'No subscription ID in session' },
            { status: 400 }
          );
        }
        
        // Fetch the subscription to get period info
        const subscription = await stripe.subscriptions.retrieve(
          subscriptionId as string
        );
        
        // Create subscription record in the database
        const { error: insertError } = await supabase
          .from('subscriptions')
          .insert({
            user_id: userId,
            tier_id: parseInt(tierId as string),
            stripe_subscription_id: subscriptionId as string,
            stripe_customer_id: session.customer as string,
            status: subscription.status,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
          });
        
        if (insertError) {
          console.error('Error inserting subscription:', insertError);
          return NextResponse.json(
            { error: 'Failed to create subscription record' },
            { status: 500 }
          );
        }
        
        break;
      }
      
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        
        // Update the subscription in the database
        const { error: updateError } = await supabase
          .from('subscriptions')
          .update({
            status: subscription.status,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
            updated_at: new Date().toISOString()
          })
          .eq('stripe_subscription_id', subscription.id);
        
        if (updateError) {
          console.error('Error updating subscription:', updateError);
          return NextResponse.json(
            { error: 'Failed to update subscription record' },
            { status: 500 }
          );
        }
        
        break;
      }
      
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        
        // Update the subscription in the database to canceled
        const { error: updateError } = await supabase
          .from('subscriptions')
          .update({
            status: 'canceled',
            updated_at: new Date().toISOString()
          })
          .eq('stripe_subscription_id', subscription.id);
        
        if (updateError) {
          console.error('Error canceling subscription:', updateError);
          return NextResponse.json(
            { error: 'Failed to cancel subscription record' },
            { status: 500 }
          );
        }
        
        break;
      }
    }
    
    // Return success
    return NextResponse.json({ received: true });
    
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 400 }
    );
  }
}