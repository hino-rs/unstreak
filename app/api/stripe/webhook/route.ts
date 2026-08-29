import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { PRICE_CREDIT_GRANTS, PRICE_PLAN, type SubscriptionPlan } from "@/lib/credits";

export async function POST(req: Request) {
  const body = await req.text(); // 生ボディ(署名検証に必須)
  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("missing signature", { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error("[stripe webhook] signature verification failed:", err);
    return new Response("invalid signature", { status: 400 });
  }

  const admin = createAdminClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      // 定期課金の初回分は invoice.paid で付与するため、topup(payment)のみここで処理
      if (session.mode !== "payment") break;

      const userId = session.client_reference_id;
      if (!userId) {
        console.error("[stripe webhook] checkout.session.completed missing client_reference_id");
        break;
      }

      const full = await stripe.checkout.sessions.retrieve(session.id, {
        expand: ["line_items"],
      });
      const priceId = full.line_items?.data[0]?.price?.id;
      const amount = priceId ? PRICE_CREDIT_GRANTS[priceId] : undefined;
      if (!amount) {
        console.error(`[stripe webhook] no credit grant configured for price ${priceId}`);
        break;
      }

      const { error } = await admin.rpc("grant_credit", {
        p_user_id: userId,
        p_amount: amount,
        p_reason: "stripe_topup",
        p_stripe_event_id: event.id,
      });
      if (error) console.error("[stripe webhook] grant_credit (topup) failed:", error);
      break;
    }

    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
      // Stripe API 2025-* 以降、Invoice.subscription は廃止され parent 経由になっている
      const subscriptionRef = invoice.parent?.subscription_details?.subscription;
      const subscriptionId =
        typeof subscriptionRef === "string" ? subscriptionRef : subscriptionRef?.id;
      if (!subscriptionId) break; // サブスクに紐付かない請求書は無視

      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const userId = subscription.metadata?.supabase_user_id;
      if (!userId) {
        console.error(`[stripe webhook] subscription ${subscriptionId} missing supabase_user_id metadata`);
        break;
      }

      const priceId = subscription.items.data[0]?.price.id;
      const amount = priceId ? PRICE_CREDIT_GRANTS[priceId] : undefined;
      if (!amount) {
        console.error(`[stripe webhook] no credit grant configured for price ${priceId}`);
        break;
      }

      const { error } = await admin.rpc("grant_credit", {
        p_user_id: userId,
        p_amount: amount,
        p_reason: "stripe_subscription",
        p_stripe_event_id: event.id,
      });
      if (error) console.error("[stripe webhook] grant_credit (subscription) failed:", error);
      break;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.supabase_user_id;
      if (!userId) break;

      // 解約後(deleted)やダウングレード時、priceに対応するプランが無ければFree(null)に戻す
      const priceId = subscription.items.data[0]?.price.id;
      const plan: SubscriptionPlan | null =
        event.type === "customer.subscription.deleted"
          ? null
          : (priceId ? PRICE_PLAN[priceId] : undefined) ?? null;

      const { error } = await admin
        .from("credit_balances")
        .update({
          stripe_subscription_status: subscription.status,
          plan,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);
      if (error) console.error("[stripe webhook] failed to sync subscription status:", error);
      break;
    }

    default:
      break;
  }

  return new Response(null, { status: 200 });
}
