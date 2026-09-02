import { NextRequest, NextResponse } from "next/server";
import { createSupabaseClient } from "@/lib/supabase/server";
import { checkRateLimit, withConcurrencyLock, ConcurrencyLimitError } from "@/lib/rate-limit";
import type { SubscriptionPlan } from "@/lib/credits";
import { scoreToLabel } from "@/lib/level";
import {
  MAX_TOPIC_MESSAGE_LENGTH,
  MAX_TOPIC_USER_TURNS,
  countUserTurns,
  getTopicTurns,
  toTopicProfile,
} from "@/lib/topic";
import { generateAi5Turn, type Ai5HistoryTurn } from "@/lib/ai5";

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

  const { text } = await req.json();
  if (typeof text !== "string" || text.trim().length === 0 || text.length > MAX_TOPIC_MESSAGE_LENGTH) {
    return NextResponse.json({ error: "invalid text" }, { status: 400 });
  }

  const { data: session, error: sessionError } = await supabase
    .from("topic_sessions")
    .select("id, status")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (sessionError || !session) {
    return NextResponse.json({ error: "session not found" }, { status: 404 });
  }
  if (session.status !== "active") {
    return NextResponse.json({ error: "session is not active" }, { status: 409 });
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
  const plan = (balance?.plan ?? null) as SubscriptionPlan | null;

  let payload;
  try {
    payload = await withConcurrencyLock(user.id, async () => {
      // ロックの内側で読み直す。このユーザーの書き込みは直列化されているので、
      // ここで採番したturn_indexが他リクエストと衝突しない
      const turns = await getTopicTurns(supabase, sessionId);

      if (countUserTurns(turns) >= MAX_TOPIC_USER_TURNS) {
        await supabase
          .from("topic_sessions")
          .update({ status: "awaiting_end" })
          .eq("id", sessionId)
          .eq("status", "active");
        return { turnCapReached: true as const };
      }

      const userTurnIndex = turns.length;
      const { error: userTurnError } = await supabase.from("topic_turns").insert({
        session_id: sessionId,
        user_id: user.id,
        turn_index: userTurnIndex,
        role: "user",
        content: text,
      });
      if (userTurnError) throw userTurnError;

      const history: Ai5HistoryTurn[] = [
        ...turns.map((t) => ({ role: t.role, content: t.content })),
        { role: "user" as const, content: text },
      ];

      const ai5 = await generateAi5Turn({ profile, history, learnerLevel, plan });

      const { data: aiTurnRow, error: aiTurnError } = await supabase
        .from("topic_turns")
        .insert({
          session_id: sessionId,
          user_id: user.id,
          turn_index: userTurnIndex + 1,
          role: "ai5",
          content: ai5.utterance,
        })
        .select("id")
        .single();
      if (aiTurnError || !aiTurnRow) {
        throw aiTurnError ?? new Error("topic_turns insert returned no row");
      }

      // 今回の発言でソフトキャップに到達したら、以降は終了(採点)だけを許す
      const userTurnsAfter = countUserTurns(turns) + 1;
      const capReachedNow = userTurnsAfter >= MAX_TOPIC_USER_TURNS;
      if (capReachedNow) {
        await supabase
          .from("topic_sessions")
          .update({ status: "awaiting_end" })
          .eq("id", sessionId)
          .eq("status", "active");
      }

      return {
        turnCapReached: false as const,
        userTurnIndex,
        turn: { id: aiTurnRow.id as string, content: ai5.utterance },
        capReachedNow,
        remainingTurns: Math.max(MAX_TOPIC_USER_TURNS - userTurnsAfter, 0),
      };
    });
  } catch (e) {
    if (e instanceof ConcurrencyLimitError) {
      return NextResponse.json({ error: "request already in progress" }, { status: 429 });
    }
    throw e;
  }

  return NextResponse.json(payload);
}
