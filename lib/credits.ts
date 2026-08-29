import type { SupabaseClient } from "@supabase/supabase-js";

// アクション毎の消費クレジット数。question/nextImageは原価がほぼゼロかつ
// 「質問する行為の心理的コストをゼロに保つ」というプロダクト設計思想上、無料化している。
// 詳細はdocs/料金プラン設計.md参照
export const CREDIT_COSTS = {
  grade: Number(process.env.CREDIT_COST_GRADE ?? 3),
  question: Number(process.env.CREDIT_COST_QUESTION ?? 0),
  nextImage: Number(process.env.CREDIT_COST_NEXT_IMAGE ?? 0),
  reveal: Number(process.env.CREDIT_COST_REVEAL ?? 2),
  listeningTurn: Number(process.env.CREDIT_COST_LISTENING_TURN ?? 1),
} as const;

export type SubscriptionPlan = "standard" | "pro";

type PriceEntry = { credits: number; plan?: SubscriptionPlan };

function priceEntry(envKey: string, defaultCredits: number, plan?: SubscriptionPlan): Record<string, PriceEntry> {
  const priceId = process.env[envKey];
  if (!priceId) return {};
  const credits = Number(process.env[`CREDIT_GRANT_${envKey.replace(/^STRIPE_PRICE_/, "")}`] ?? defaultCredits);
  return { [priceId]: { credits, plan } };
}

// Stripe Price ID -> 付与クレジット数・プラン種別。docs/料金プラン設計.md参照
const PRICE_TABLE: Record<string, PriceEntry> = {
  ...priceEntry("STRIPE_PRICE_STANDARD_MONTHLY", 300, "standard"),
  ...priceEntry("STRIPE_PRICE_PRO_MONTHLY", 700, "pro"),
  ...priceEntry("STRIPE_PRICE_TOPUP_SMALL", 75),
  ...priceEntry("STRIPE_PRICE_TOPUP_MEDIUM", 300),
  ...priceEntry("STRIPE_PRICE_TOPUP_LARGE", 690),
};

export const PRICE_CREDIT_GRANTS: Record<string, number> = Object.fromEntries(
  Object.entries(PRICE_TABLE).map(([priceId, entry]) => [priceId, entry.credits])
);

// サブスクのPrice ID -> プラン種別。トップアップのPriceは含まれない
export const PRICE_PLAN: Record<string, SubscriptionPlan> = Object.fromEntries(
  Object.entries(PRICE_TABLE)
    .filter((entry): entry is [string, PriceEntry & { plan: SubscriptionPlan }] => entry[1].plan !== undefined)
    .map(([priceId, entry]) => [priceId, entry.plan])
);

export class InsufficientCreditsError extends Error {
  constructor() {
    super("insufficient credits");
    this.name = "InsufficientCreditsError";
  }
}

export async function consumeCredit(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  userId: string,
  amount: number,
  reason: string
): Promise<void> {
  if (amount <= 0) return; // credit_transactions.delta <> 0 制約があるため0円消費は呼ばない
  const { data: ok, error } = await supabase.rpc("consume_credit", {
    p_user_id: userId,
    p_amount: amount,
    p_reason: reason,
  });
  if (error) throw error;
  if (!ok) throw new InsufficientCreditsError();
}

export async function refundCredit(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  userId: string,
  amount: number,
  reason: string
): Promise<void> {
  if (amount <= 0) return;
  const { error } = await supabase.rpc("refund_credit", {
    p_user_id: userId,
    p_amount: amount,
    p_reason: reason,
  });
  if (error) console.error(`[credits] refund_credit failed (${reason}):`, error);
}
