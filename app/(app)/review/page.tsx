import { createSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ReviewView, type WeakPoint } from "./review-view";

async function getWeakPoints(): Promise<WeakPoint[]> {
  const supabase = await createSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

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

export default async function ReviewPage() {
  const weakPoints = await getWeakPoints();

  return <ReviewView initialWeakPoints={weakPoints} />;
}
