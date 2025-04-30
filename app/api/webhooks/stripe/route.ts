// app/api/webhooks/stripe/route.ts
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: Request) {
  const payload = await request.text();
  const signature = request.headers.get("stripe-signature") as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, endpointSecret);
  } catch (err) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = await createClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        
        // Get user ID from metadata
        const userId = session.metadata?.user_id;
        
        if (!userId) {
          console.error("No user ID in session metadata");
          break;
        }
        
        // If this is a subscription checkout, save the subscription details
        if (session.mode === 'subscription' && session.subscription) {
          // Fetch complete subscription details
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          );
          
          // Save subscription details to database
          await supabase.from('subscriptions').insert({
            user_id: userId,
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: subscription.id,
            status: subscription.status,
            plan_id: 'monthly',
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          });
        }
        break;
      }
      
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        
        // Find the user associated with this customer
        const { data: userData } = await supabase
          .from('customers')
          .select('user_id')
          .eq('stripe_customer_id', subscription.customer as string)
          .single();
          
        if (!userData?.user_id) {
          console.error("No user found for customer:", subscription.customer);
          break;
        }
        
        // Update subscription status
        await supabase
          .from('subscriptions')
          .update({
            status: subscription.status,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id);
        
        break;
      }
      
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        
        // Update subscription status to canceled
        await supabase
          .from('subscriptions')
          .update({
            status: 'canceled',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id);
        
        break;
      }
      
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        
        if (invoice.subscription) {
          // Update subscription with latest payment
          await supabase
            .from('subscriptions')
            .update({
              status: 'active',
              updated_at: new Date().toISOString(),
            })
            .eq('stripe_subscription_id', invoice.subscription as string);
        }
        
        break;
      }
      
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        
        if (invoice.subscription) {
          // Mark subscription as past_due
          await supabase
            .from('subscriptions')
            .update({
              status: 'past_due',
              updated_at: new Date().toISOString(),
            })
            .eq('stripe_subscription_id', invoice.subscription as string);
        }
        
        break;
      }
    }
    
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}