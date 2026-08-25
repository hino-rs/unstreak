import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase/server";
import { getListeningScenarioById, getListeningTurns, computeFailedClarificationStreak } from "@/lib/listening";
import { ListeningSessionView } from "./listening-session-view";

export default async function ListeningSessionPage({
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
  if (error || !user) {
    redirect("/login");
  }

  const { data: session, error: sessionError } = await supabase
    .from("listening_sessions")
    .select("id, scenario_id, status, transcript_revealed")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (sessionError || !session) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-3">
        <p className="text-sm text-muted-foreground">セッションが見つかりませんでした。</p>
        <Link href="/practice/listening" className="text-sm text-primary underline">
          一覧に戻る
        </Link>
      </div>
    );
  }

  const scenario = await getListeningScenarioById(supabase, session.scenario_id);
  if (!scenario) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-3">
        <p className="text-sm text-muted-foreground">シナリオが見つかりませんでした。</p>
        <Link href="/practice/listening" className="text-sm text-primary underline">
          一覧に戻る
        </Link>
      </div>
    );
  }

  const turns = await getListeningTurns(supabase, sessionId);

  return (
    <ListeningSessionView
      sessionId={session.id}
      status={session.status}
      scenario={{
        title: scenario.title,
        situationBrief: scenario.situationBrief,
        voiceAccent: scenario.voiceAccent,
        baseRate: scenario.baseRate,
      }}
      initialTurns={turns.map((t) => ({
        id: t.id,
        role: t.role,
        turnType: t.turnType,
        content: t.content,
        clarificationStrategy: t.clarificationStrategy,
      }))}
      initialRevealAllowed={computeFailedClarificationStreak(turns) >= 2}
      transcriptRevealed={session.transcript_revealed}
    />
  );
}
