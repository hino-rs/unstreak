import { NextRequest, NextResponse } from "next/server";
import { createSupabaseClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";

type CheckoutRequest = { mode: "subscription" | "topup" };

function isValidCheckoutRequest(body: unknown): body is CheckoutRequest {
  if (typeof body !== "object" || body === null) return false;
  const b = body as Record<string, unknown>;
  return b.mode === "subscription" || b.mode === "topup";
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const rawBody: unknown = await req.json();
  if (!isValidCheckoutRequest(rawBody)) {
    return NextResponse.json({ error: "invalid request body" }, { status: 400 });
  }
  const { mode } = rawBody;

  const { data: balance } = await supabase
    .from("credit_balances")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .single();

  let customerId = balance?.stripe_customer_id ?? null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { supabase_user_id: user.id },
    });
    customerId = customer.id;
    const { error: setError } = await supabase.rpc("set_stripe_customer_id", {
      p_user_id: user.id,
      p_stripe_customer_id: customerId,
    });
    if (setError) console.error("[stripe checkout] set_stripe_customer_id failed:", setError);
  }

  const priceId =
    mode === "subscription"
      ? process.env.STRIPE_PRICE_SUBSCRIPTION_MONTHLY!
      : process.env.STRIPE_PRICE_TOPUP!;

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: mode === "subscription" ? "subscription" : "payment",
    line_items: [{ price: priceId, quantity: 1 }],
    client_reference_id: user.id,
    metadata: { supabase_user_id: user.id, credit_grant_kind: mode },
    ...(mode === "subscription"
      ? { subscription_data: { metadata: { supabase_user_id: user.id } } }
      : {}),
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?success=1`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?canceled=1`,
  });

  return NextResponse.json({ url: session.url });
}
