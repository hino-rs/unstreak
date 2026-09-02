import { NextResponse } from "next/server";
import { createSupabaseClient } from "@/lib/supabase/server";
import { checkRateLimit, withConcurrencyLock, ConcurrencyLimitError } from "@/lib/rate-limit";
import type { SubscriptionPlan } from "@/lib/credits";
import { scoreToLabel } from "@/lib/level";
import {
  TopicProfileNotConfiguredError,
  TopicQuotaExceededError,
  toTopicProfile,
} from "@/lib/topic";
import { generateAi5Turn } from "@/lib/ai5";

// Proの会話相手はOpus。既定のタイムアウトだと後半のターンで際どくなりうるため明示的に伸ばす
export const maxDuration = 60;

export async function POST() {
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
      // 上限チェック・消費・セッション起票を1トランザクションで行う。
      // 進行中のセッションがあればそれのidが返り、回数は消費されない
      const { data: sessionId, error: rpcError } = await supabase.rpc("start_topic_session", {
        p_user_id: user.id,
      });
      if (rpcError) {
        if (rpcError.message?.includes("profile not configured")) {
          throw new TopicProfileNotConfiguredError();
        }
        throw rpcError;
      }
      if (!sessionId) {
        throw new TopicQuotaExceededError();
      }

      // 既に発話があるセッション=再開。AI5を呼ばずにそのまま返す
      const { count, error: countError } = await supabase
        .from("topic_turns")
        .select("id", { count: "exact", head: true })
        .eq("session_id", sessionId);
      if (countError) throw countError;

      if ((count ?? 0) > 0) {
        return { sessionId: sessionId as string, resumed: true };
      }

      try {
        const ai5 = await generateAi5Turn({
          profile,
          history: [],
          learnerLevel,
          plan,
        });

        const { error: turnError } = await supabase.from("topic_turns").insert({
          session_id: sessionId,
          user_id: user.id,
          turn_index: 0,
          role: "ai5",
          content: ai5.utterance,
        });
        if (turnError) throw turnError;

        return { sessionId: sessionId as string, resumed: false };
      } catch (innerError) {
        // 1ターンも書けていないセッションなので、消費した回数ごと巻き戻す
        try {
          await supabase.rpc("refund_topic_session", {
            p_user_id: user.id,
            p_session_id: sessionId,
          });
        } catch (refundError) {
          console.error("[topic/sessions] refund_topic_session threw:", refundError);
        }
        throw innerError;
      }
    });
  } catch (e) {
    if (e instanceof ConcurrencyLimitError) {
      return NextResponse.json({ error: "request already in progress" }, { status: 429 });
    }
    if (e instanceof TopicQuotaExceededError) {
      return NextResponse.json({ error: "monthly limit reached" }, { status: 429 });
    }
    if (e instanceof TopicProfileNotConfiguredError) {
      return NextResponse.json({ error: "profile not configured" }, { status: 400 });
    }
    throw e;
  }

  return NextResponse.json(payload);
}
