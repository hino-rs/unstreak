"use server";

import { redirect } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { GRADE_BANDS, type GradeBand } from "@/lib/level";
import { MAX_HOBBIES_LENGTH, MAX_OCCUPATION_LENGTH } from "@/lib/topic";

export async function updateGradeBand(gradeBand: string): Promise<{ error?: string }> {
  if (!GRADE_BANDS.includes(gradeBand as GradeBand)) {
    return { error: "invalid grade_band" };
  }

  const supabase = await createSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: "unauthorized" };
  }

  // .select()を付けて更新行を受け取る。profiles行が無いとUPDATEは0行でもerrorにならず、
  // 「保存成功」と表示したまま何も保存されない状態になるため、行数で成否を判定する
  const { data, error } = await supabase
    .from("profiles")
    .update({ grade_band: gradeBand })
    .eq("user_id", user.id)
    .select("user_id");
  if (error) {
    return { error: "failed to save" };
  }
  if (!data || data.length === 0) {
    console.error("[updateGradeBand] profiles row not found for user:", user.id);
    return { error: "profile row not found" };
  }
  return {};
}

// トピック説明のAI5が会話の材料に使う。どちらかが空ならこの機能は使えない(未設定扱い)
export async function updateTopicProfile(
  occupation: string,
  hobbies: string
): Promise<{ error?: string }> {
  const trimmedOccupation = occupation.trim();
  const trimmedHobbies = hobbies.trim();

  if (trimmedOccupation.length > MAX_OCCUPATION_LENGTH) {
    return { error: "occupation too long" };
  }
  if (trimmedHobbies.length > MAX_HOBBIES_LENGTH) {
    return { error: "hobbies too long" };
  }

  const supabase = await createSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: "unauthorized" };
  }

  // 空文字はnullに寄せて「未設定」の表現をDB側で1通りに保つ。
  // .select()で更新行を受け取り、0行(profiles行が無い)を成功扱いしないようにする
  const { data, error } = await supabase
    .from("profiles")
    .update({
      occupation: trimmedOccupation || null,
      hobbies: trimmedHobbies || null,
    })
    .eq("user_id", user.id)
    .select("user_id");
  if (error) {
    return { error: "failed to save" };
  }
  if (!data || data.length === 0) {
    console.error("[updateTopicProfile] profiles row not found for user:", user.id);
    return { error: "profile row not found" };
  }
  return {};
}

export async function deleteAccount() {
  const supabase = await createSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect("/login");
  }

  // 関連テーブル(profiles等)はauth.usersへのFKにON DELETE CASCADEが設定されているため、
  // ユーザー削除だけで学習履歴等も連動して削除される
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    console.error("退会処理エラー:", error.message);
    redirect("/settings?error=" + encodeURIComponent("退会処理に失敗しました。しばらくしてから再度お試しください。"));
  }

  await supabase.auth.signOut();
  redirect("/login?message=" + encodeURIComponent("退会が完了しました。ご利用ありがとうございました。"));
}
