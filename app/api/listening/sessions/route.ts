import { NextRequest, NextResponse } from "next/server";
import { createSupabaseClient } from "@/lib/supabase/server";
import { checkRateLimit, withConcurrencyLock, ConcurrencyLimitError } from "@/lib/rate-limit";
import { CREDIT_COSTS, InsufficientCreditsError, consumeCredit, refundCredit } from "@/lib/credits";
import { scoreToLabel } from "@/lib/level";
import { getListeningScenarioById, scoreToListeningTier, LISTENING_TIER_NUMBER } from "@/lib/listening";
import { generateAi4Turn, sanitizeTargetItemsUsed } from "@/lib/ai4";

export async function POST(req: NextRequest) {
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

  const { scenarioId } = await req.json();
  if (typeof scenarioId !== "string" || scenarioId.length === 0) {
    return NextResponse.json({ error: "invalid scenarioId" }, { status: 400 });
  }

  const scenario = await getListeningScenarioById(supabase, scenarioId);
  if (!scenario) {
    return NextResponse.json({ error: "scenario not found" }, { status: 404 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("level_score, listening_tier_score")
    .eq("user_id", user.id)
    .single();
  const learnerLevel = scoreToLabel(profile?.level_score);
  const tierAtStart = LISTENING_TIER_NUMBER[scoreToListeningTier(profile?.listening_tier_score)];

  let payload;
  try {
    payload = await withConcurrencyLock(user.id, async () => {
      await consumeCredit(supabase, user.id, CREDIT_COSTS.listeningTurn, "listening_session_start");
      try {
        const ai4 = await generateAi4Turn({
          scenario: {
            title: scenario.title,
            situationBrief: scenario.situationBrief,
            targetVocab: scenario.targetVocab,
            targetReductions: scenario.targetReductions,
          },
          history: [],
          incomingTurnType: "session_start",
          learnerLevel,
        });
        const targetItemsUsed = sanitizeTargetItemsUsed(ai4.targetItemsUsed);

        const { data: session, error: sessionError } = await supabase
          .from("listening_sessions")
          .insert({
            user_id: user.id,
            scenario_id: scenario.id,
            tier_at_start: tierAtStart,
            credits_charged: CREDIT_COSTS.listeningTurn,
          })
          .select("id")
          .single();
        if (sessionError || !session) {
          throw sessionError ?? new Error("listening_sessions insert returned no row");
        }

        const { data: turnRow, error: turnError } = await supabase
          .from("listening_turns")
          .insert({
            session_id: session.id,
            user_id: user.id,
            turn_index: 0,
            role: "ai",
            turn_type: "utterance",
            content: ai4.utteranceText,
            target_items_used: targetItemsUsed,
          })
          .select("id")
          .single();
        if (turnError || !turnRow) {
          throw turnError ?? new Error("listening_turns insert returned no row");
        }

        return {
          sessionId: session.id as string,
          scenario: {
            title: scenario.title,
            situationBrief: scenario.situationBrief,
            voiceAccent: scenario.voiceAccent,
            baseRate: scenario.baseRate,
          },
          firstTurn: { id: turnRow.id as string, content: ai4.utteranceText, audioRate: scenario.baseRate },
        };
      } catch (innerError) {
        try {
          await refundCredit(supabase, user.id, CREDIT_COSTS.listeningTurn, "listening_session_start_refund");
        } catch (refundError) {
          console.error("[listening/sessions] refundCredit threw:", refundError);
        }
        throw innerError;
      }
    });
  } catch (e) {
    if (e instanceof ConcurrencyLimitError) {
      return NextResponse.json({ error: "request already in progress" }, { status: 429 });
    }
    if (e instanceof InsufficientCreditsError) {
      return NextResponse.json({ error: "insufficient credits" }, { status: 402 });
    }
    throw e;
  }

  return NextResponse.json(payload);
}
