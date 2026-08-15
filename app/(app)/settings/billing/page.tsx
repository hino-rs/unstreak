import { redirect } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase/server";
import { BillingView } from "./billing-view";

export default async function BillingPage() {
  const supabase = await createSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");

  const { data: balance } = await supabase
    .from("credit_balances")
    .select("credits, stripe_subscription_status")
    .eq("user_id", user.id)
    .single();

  const { data: transactions } = await supabase
    .from("credit_transactions")
    .select("id, delta, reason, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <BillingView
      credits={balance?.credits ?? 0}
      subscriptionStatus={balance?.stripe_subscription_status ?? null}
      transactions={transactions ?? []}
    />
  );
}
