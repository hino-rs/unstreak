import { redirect } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase/server";
import { LockedFeature } from "@/components/locked-feature";
import { getTopicMonthlyUsage, toTopicProfile } from "@/lib/topic";
import { TopicStartView } from "./topic-start-view";

export default async function TopicPage() {
  const supabase = await createSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("occupation, hobbies")
    .eq("user_id", user.id)
    .single();

  // 職業・趣味が未設定ではAI5が話題を作れないので、先にプロフィールへ誘導する
  const profile = toTopicProfile(profileRow);
  if (!profile) {
    return (
      <LockedFeature
        title="トピック説明"
        description="この機能を使うには、プロフィールに職業と趣味を設定してください。設定した内容をもとに、AIがあなたに合わせた話題で英語の質問を投げかけます。"
        badgeLabel="設定が必要"
        actionLabel="プロフィールを設定する"
        actionHref="/profile"
      />
    );
  }

  // 進行中のセッションがあれば続きから。回数は消費済みなので再開しても増えない
  const { data: activeSession } = await supabase
    .from("topic_sessions")
    .select("id")
    .eq("user_id", user.id)
    .in("status", ["active", "awaiting_end"])
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const [{ data: monthlyLimit }, usedCount] = await Promise.all([
    supabase.rpc("topic_monthly_limit", { p_user_id: user.id }),
    getTopicMonthlyUsage(supabase, user.id),
  ]);

  return (
    <TopicStartView
      profile={profile}
      activeSessionId={activeSession?.id ?? null}
      monthlyLimit={monthlyLimit ?? 0}
      usedCount={usedCount}
    />
  );
}
