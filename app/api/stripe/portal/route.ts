import { NextResponse } from "next/server";
import { createSupabaseClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";

export async function POST() {
  const supabase = await createSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: balance } = await supabase
    .from("credit_balances")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .single();

  if (!balance?.stripe_customer_id) {
    return NextResponse.json({ error: "no stripe customer" }, { status: 400 });
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: balance.stripe_customer_id,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing`,
  });

  return NextResponse.json({ url: session.url });
}
