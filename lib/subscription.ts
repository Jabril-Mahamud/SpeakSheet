// lib/subscription.ts
import { createClient } from '@/utils/supabase/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const SUBSCRIPTION_PRICE_ID = process.env.STRIPE_PRICE_ID!;

export async function checkSubscriptionStatus(userId: string): Promise<boolean> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('subscriptions')
    .select('status, current_period_end')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
    
  if (error || !data) {
    return false;
  }
  
  if (data.status !== 'active' && data.status !== 'trialing') {
    return false;
  }
  
  const currentPeriodEnd = new Date(data.current_period_end);
  return currentPeriodEnd > new Date();
}

export async function createSubscription(
  userId: string, 
  email: string,
  paymentMethodId: string
): Promise<{ subscriptionId: string; clientSecret: string }> {
  // Create or get Stripe customer
  const { data: userData } = await (await createClient())
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', userId)
    .single();
    
  let customerId = userData?.stripe_customer_id;
  
  if (!customerId) {
    const customer = await stripe.customers.create({
      email,
      payment_method: paymentMethodId,
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });
    customerId = customer.id;
  }
  
  // Create the subscription
  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: SUBSCRIPTION_PRICE_ID }],
    payment_behavior: 'default_incomplete',
    expand: ['latest_invoice.payment_intent'],
  });
  
  // Fix: Cast subscription properties to extract timestamps
  const startTime = (subscription as any).current_period_start;
  const endTime = (subscription as any).current_period_end;

  // Save subscription data to database
  const supabase = await createClient();
  await supabase.from('subscriptions').insert({
    user_id: userId,
    status: subscription.status,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    plan_id: 'monthly',
    current_period_start: new Date(startTime * 1000).toISOString(),
    current_period_end: new Date(endTime * 1000).toISOString(),
  });
  
  // Fix: Handle payment intent extraction safely
  const invoice = subscription.latest_invoice as any;
  let clientSecret = '';
  
  if (invoice && typeof invoice !== 'string') {
    const paymentIntent = invoice.payment_intent;
    if (paymentIntent && typeof paymentIntent !== 'string' && paymentIntent.client_secret) {
      clientSecret = paymentIntent.client_secret;
    }
  }
  
  return {
    subscriptionId: subscription.id,
    clientSecret: clientSecret,
  };
}