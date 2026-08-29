import { SupabaseClient, User } from "@supabase/supabase-js";
import { createSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ReviewView, type WeakPoint } from "./review-view";
import { getWeakPointTrends, type WeakPointTrend } from "@/lib/weak-point-trends";

async function getWeakPoints(supabase: SupabaseClient, user: User): Promise<WeakPoint[]> {
  const { data: weakPoints, error: getWeakPointsError } = await supabase
    .from("weak_points")
    .select("category, display_label, times_flagged, last_seen_at")
    .eq("user_id", user.id);

  if (getWeakPointsError) {
    console.error("weak_pointsからの取得に失敗:", getWeakPointsError);
    return [];
  }

  return (weakPoints as WeakPoint[]) ?? [];
}

async function getIsPro(supabase: SupabaseClient, user: User): Promise<boolean> {
  const { data } = await supabase
    .from("credit_balances")
    .select("plan")
    .eq("user_id", user.id)
    .single();
  return data?.plan === "pro";
}

export default async function ReviewPage() {
  const supabase = await createSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  const isPro = await getIsPro(supabase, user);
  const [weakPoints, trends] = await Promise.all([
    getWeakPoints(supabase, user),
    isPro ? getWeakPointTrends(supabase, user.id) : Promise.resolve<WeakPointTrend[]>([]),
  ]);

  return <ReviewView initialWeakPoints={weakPoints} isPro={isPro} trends={trends} />;
}
