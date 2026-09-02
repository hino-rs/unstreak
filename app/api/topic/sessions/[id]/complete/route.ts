import { NextRequest, NextResponse } from "next/server";
import { createSupabaseClient } from "@/lib/supabase/server";
import { checkRateLimit, withConcurrencyLock, ConcurrencyLimitError } from "@/lib/rate-limit";
import { gradeTopicSession, toConceptKey, toDisplayLabel } from "@/lib/ai1";
import type { GradingError } from "@/lib/ai1";
import { scoreToLabel, updateLevelScore } from "@/lib/level";
import { countUserTurns, getTopicTurns, toTopicProfile } from "@/lib/topic";

// 会話ログ全体をまとめて採点するので、この機能の中で最も遅いルート
export const maxDuration = 60;

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
    .from("topic_sessions")
    .select("id, status, ai1_response")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (sessionError || !session) {
    return NextResponse.json({ error: "session not found" }, { status: 404 });
  }
  // 既に採点済みなら保存済みの結果をそのまま返す(二重採点しない)
  if (session.status === "completed" && session.ai1_response) {
    return NextResponse.json({ grading: session.ai1_response });
  }

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("level_score, occupation, hobbies")
    .eq("user_id", user.id)
    .single();
  const profile = toTopicProfile(profileRow);
  if (!profile) {
    return NextResponse.json({ error: "profile not configured" }, { status: 400 });
  }
  const learnerLevel = scoreToLabel(profileRow?.level_score);

  const { data: balance } = await supabase
    .from("credit_balances")
    .select("plan")
    .eq("user_id", user.id)
    .single();
  const isPro = balance?.plan === "pro";

  const turns = await getTopicTurns(supabase, sessionId);
  if (countUserTurns(turns) === 0) {
    return NextResponse.json({ error: "no user turns to grade" }, { status: 400 });
  }

  let grading;
  try {
    grading = await withConcurrencyLock(user.id, async () =>
      gradeTopicSession(
        turns.map((t) => ({ turnIndex: t.turnIndex, role: t.role, content: t.content })),
        profile,
        learnerLevel,
        isPro
      )
    );
  } catch (e) {
    if (e instanceof ConcurrencyLimitError) {
      return NextResponse.json({ error: "request already in progress" }, { status: 429 });
    }
    throw e;
  }

  // 採点が終わってからcompletedにする。ここで失敗しても採点結果は返す(次回呼び出しで再試行できる)
  const { error: updateError } = await supabase
    .from("topic_sessions")
    .update({
      status: "completed",
      ai1_response: grading,
      ended_at: new Date().toISOString(),
    })
    .eq("id", sessionId)
    .in("status", ["active", "awaiting_end"]);
  if (updateError) {
    console.error("[topic/complete] session update failed:", updateError);
  }

  updateLevelScore(supabase, user.id, grading.level_estimate).catch((err) => {
    console.error("[topic/complete] updateLevelScore failed:", err);
  });

  // 弱点プールへの反映。1セッション内で同じconcept_keyが複数出ても1回分としてカウントする
  const seenKeys = new Set<string>();
  const uniqueErrors: { error: GradingError; conceptKey: string }[] = [];
  for (const utterance of grading.utterances) {
    for (const err of utterance.errors) {
      const conceptKey = toConceptKey(err);
      if (!conceptKey || seenKeys.has(conceptKey)) continue;
      seenKeys.add(conceptKey);
      uniqueErrors.push({ error: err, conceptKey });
    }
  }

  const weakPointResults = await Promise.allSettled(
    uniqueErrors.map(({ error: err, conceptKey }) =>
      supabase.rpc("upsert_weak_point", {
        p_user_id: user.id,
        p_concept_key: conceptKey,
        p_category: err.category,
        p_display_label: toDisplayLabel(err),
      })
    )
  );
  weakPointResults.forEach((result, i) => {
    if (result.status === "rejected") {
      console.error(
        `[topic/complete] upsert_weak_point failed for ${uniqueErrors[i].conceptKey}:`,
        result.reason
      );
    } else if (result.value.error) {
      console.error(
        `[topic/complete] upsert_weak_point RPC error for ${uniqueErrors[i].conceptKey}:`,
        result.value.error
      );
    }
  });

  return NextResponse.json({ grading });
}
