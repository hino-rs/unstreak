import type { SupabaseClient } from "@supabase/supabase-js";

// アクション毎の消費クレジット数。金額未確定のためenv varで上書き可能にし、
// デフォルト値のみコードに残す
export const CREDIT_COSTS = {
  grade: Number(process.env.CREDIT_COST_GRADE ?? 3),
  question: Number(process.env.CREDIT_COST_QUESTION ?? 1),
  nextImage: Number(process.env.CREDIT_COST_NEXT_IMAGE ?? 1),
  reveal: Number(process.env.CREDIT_COST_REVEAL ?? 2),
} as const;

// Stripe Price ID -> 付与クレジット数。複数SKU(トップアップ階層追加など)に拡張可能
export const PRICE_CREDIT_GRANTS: Record<string, number> = {
  ...(process.env.STRIPE_PRICE_SUBSCRIPTION_MONTHLY
    ? {
        [process.env.STRIPE_PRICE_SUBSCRIPTION_MONTHLY]: Number(
          process.env.CREDIT_GRANT_SUBSCRIPTION_MONTHLY ?? 150
        ),
      }
    : {}),
  ...(process.env.STRIPE_PRICE_TOPUP
    ? {
        [process.env.STRIPE_PRICE_TOPUP]: Number(
          process.env.CREDIT_GRANT_TOPUP ?? 100
        ),
      }
    : {}),
};

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
  const { error } = await supabase.rpc("refund_credit", {
    p_user_id: userId,
    p_amount: amount,
    p_reason: reason,
  });
  if (error) console.error(`[credits] refund_credit failed (${reason}):`, error);
}
