import { NextRequest, NextResponse } from "next/server";
import { createSupabaseClient } from "@/lib/supabase/server";
import { checkRateLimit, withConcurrencyLock, ConcurrencyLimitError } from "@/lib/rate-limit";
import {
  getListeningScenarioById,
  getListeningTurns,
  computeClarificationRate,
  tierEstimateFromClarificationRate,
  updateListeningTierScore,
} from "@/lib/listening";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: sessionId } = await params;
  const supabase = await createSupabaseClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const rateLimitResult = await checkRateLimit(user.id);
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: "too many requests" },
      { status: 429, headers: { "Retry-After": String(rateLimitResult.retryAfterSeconds) } }
    );
  }

  const { data: session, error: sessionError } = await supabase
    .from("listening_sessions")
    .select("id, scenario_id, status, transcript_revealed")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (sessionError || !session) {
    return NextResponse.json({ error: "session not found" }, { status: 404 });
  }
  if (session.status !== "active") {
    return NextResponse.json({ error: "session already completed" }, { status: 409 });
  }

  const scenario = await getListeningScenarioById(supabase, session.scenario_id);

  let summary;
  try {
    summary = await withConcurrencyLock(user.id, async () => {
      const turns = await getListeningTurns(supabase, sessionId);
      const clarificationRate = computeClarificationRate(turns);
      const clarificationCount = turns.filter((t) => t.turnType === "clarification_request").length;

      const { error: updateError } = await supabase
        .from("listening_sessions")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          clarification_rate: clarificationRate,
        })
        .eq("id", sessionId)
        .eq("user_id", user.id)
        .eq("status", "active");
      if (updateError) throw updateError;

      return { turnCount: turns.length, clarificationCount, clarificationRate };
    });
  } catch (e) {
    if (e instanceof ConcurrencyLimitError) {
      return NextResponse.json({ error: "request already in progress" }, { status: 429 });
    }
    throw e;
  }

  // ウォームアップ(is_onboarding)セッションは意図的に簡単にしてあるため、
  // 実力指標(listening_tier_score)には反映しない
  if (!scenario?.isOnboarding) {
    const tierEstimate = tierEstimateFromClarificationRate(summary.clarificationRate);
    updateListeningTierScore(supabase, user.id, tierEstimate).catch((err) => {
      console.error("[listening/complete] updateListeningTierScore failed:", err);
    });
  }

  return NextResponse.json({
    summary: {
      turnCount: summary.turnCount,
      clarificationCount: summary.clarificationCount,
      clarificationRate: summary.clarificationRate,
      transcriptRevealed: session.transcript_revealed,
    },
  });
}
