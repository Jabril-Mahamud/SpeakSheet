// app/api/subscription/create/route.ts
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const PRICE_ID = process.env.STRIPE_PRICE_ID!;

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user already has a subscription
    const { data: existingSubscription } = await supabase
      .from("subscriptions")
      .select("stripe_subscription_id, status, stripe_customer_id") // Added stripe_customer_id here
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (existingSubscription) {
      // If user has active subscription, redirect to billing portal
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: existingSubscription.stripe_customer_id,
        return_url: `${request.headers.get("origin")}/protected`,
      });

      return NextResponse.json({ url: portalSession.url });
    }

    // Get or create Stripe customer
    let { data: customerData } = await supabase
      .from("customers")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    let customerId: string;

    if (customerData?.stripe_customer_id) {
      customerId = customerData.stripe_customer_id;
    } else {
      // Create a new customer
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          user_id: user.id,
        },
      });

      customerId = customer.id;

      // Save the customer ID
      await supabase.from("customers").insert({
        user_id: user.id,
        stripe_customer_id: customerId,
      });
    }

    // Create a checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price: PRICE_ID,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${request.headers.get("origin")}/protected?success=true`,
      cancel_url: `${request.headers.get("origin")}/protected?canceled=true`,
      metadata: {
        user_id: user.id,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
