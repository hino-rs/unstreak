"use server";

import { createSupabaseClient } from "@/lib/supabase/server";
import { GRADE_BANDS, type GradeBand } from "@/lib/level";

export async function updateGradeBand(gradeBand: string): Promise<{ error?: string }> {
  if (!GRADE_BANDS.includes(gradeBand as GradeBand)) {
    return { error: "invalid grade_band" };
  }

  const supabase = await createSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: "unauthorized" };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ grade_band: gradeBand })
    .eq("user_id", user.id);
  if (error) {
    return { error: "failed to save" };
  }
  return {};
}
