import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase/server";
import { getTopicTurns, toTopicProfile } from "@/lib/topic";
import type { TopicSessionGrading } from "@/lib/ai1";
import { TopicSessionView } from "./topic-session-view";

export default async function TopicSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const supabase = await createSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");

  const { data: session } = await supabase
    .from("topic_sessions")
    .select("id, status, ai1_response")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!session) {
    return (
      <div className="p-6 md:p-8 max-w-3xl mx-auto w-full space-y-3">
        <p className="text-sm text-muted-foreground">この会話は見つかりませんでした。</p>
        <Link href="/practice/topic" className="text-sm text-primary underline">
          トピック説明に戻る
        </Link>
      </div>
    );
  }

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("occupation, hobbies")
    .eq("user_id", user.id)
    .single();
  const profile = toTopicProfile(profileRow);
  if (!profile) redirect("/practice/topic");

  // リロードしても続きから復元できるよう、履歴と(あれば)採点結果はサーバー側で読む
  const turns = await getTopicTurns(supabase, sessionId);

  return (
    <TopicSessionView
      sessionId={session.id}
      initialTurns={turns}
      initialStatus={session.status as "active" | "awaiting_end" | "completed"}
      initialGrading={(session.ai1_response as TopicSessionGrading | null) ?? null}
    />
  );
}
