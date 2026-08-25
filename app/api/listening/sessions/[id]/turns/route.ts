import { NextRequest, NextResponse } from "next/server";
import { createSupabaseClient } from "@/lib/supabase/server";
import { checkRateLimit, withConcurrencyLock, ConcurrencyLimitError } from "@/lib/rate-limit";
import { CREDIT_COSTS, InsufficientCreditsError, consumeCredit, refundCredit } from "@/lib/credits";
import { scoreToLabel } from "@/lib/level";
import {
  getListeningScenarioById,
  getListeningTurns,
  computeFailedClarificationStreak,
  turnAudioRate,
  turnCapForScenario,
} from "@/lib/listening";
import { generateAi4Turn, sanitizeTargetItemsUsed } from "@/lib/ai4";

const MAX_USER_TEXT_LENGTH = 1000;

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

  const { type, text } = await req.json();
  if (type !== "reply" && type !== "clarification") {
    return NextResponse.json({ error: "invalid type" }, { status: 400 });
  }
  if (typeof text !== "string" || text.length === 0 || text.length > MAX_USER_TEXT_LENGTH) {
    return NextResponse.json({ error: "invalid text" }, { status: 400 });
  }

  const { data: session, error: sessionError } = await supabase
    .from("listening_sessions")
    .select("id, scenario_id, status")
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
  if (!scenario) {
    return NextResponse.json({ error: "scenario not found" }, { status: 500 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("level_score")
    .eq("user_id", user.id)
    .single();
  const learnerLevel = scoreToLabel(profile?.level_score);

  const userTurnType: "clarification_request" | "user_reply" =
    type === "clarification" ? "clarification_request" : "user_reply";
  const turnCap = turnCapForScenario(scenario);
  // ウォームアップ(is_onboarding)シナリオはクレジット消費なし
  const turnCost = scenario.isOnboarding ? 0 : CREDIT_COSTS.listeningTurn;

  let payload;
  try {
    payload = await withConcurrencyLock(user.id, async () => {
      // 排他ロック内で毎回取り直す(このユーザーのlistening_turns書き込みは全てこのロック配下で
      // 直列化されるため、ここで取得したturnsはturn_index採番・AI4への履歴渡しに安全に使える)
      const turns = await getListeningTurns(supabase, sessionId);
      if (turns.length >= turnCap) {
        return { turnCapReached: true as const };
      }

      if (turnCost > 0) {
        await consumeCredit(supabase, user.id, turnCost, "listening_turn");
      }
      try {
        const nextIndex = turns.length;
        const lastAiTurn = [...turns].reverse().find((t) => t.role === "ai");
        const priorFailedStreak = computeFailedClarificationStreak(turns);

        const { data: userTurnRow, error: userTurnError } = await supabase
          .from("listening_turns")
          .insert({
            session_id: sessionId,
            user_id: user.id,
            turn_index: nextIndex,
            role: "user",
            turn_type: userTurnType,
            content: text,
          })
          .select("id")
          .single();
        if (userTurnError || !userTurnRow) {
          throw userTurnError ?? new Error("listening_turns insert returned no row");
        }

        // 明示シグナル: 聞き返し発生時、直前のAI発話が使った語彙・省略パターンを弱点プールへ反映
        if (type === "clarification" && lastAiTurn && lastAiTurn.targetItemsUsed.length > 0) {
          const items = lastAiTurn.targetItemsUsed;
          const weakPointResults = await Promise.allSettled(
            items.map((item) =>
              supabase.rpc("upsert_weak_point", {
                p_user_id: user.id,
                // lastAiTurn.targetItemsUsed は書き込み時に既にsanitizeTargetItemsUsedを通っている
                // (小文字化・トリム済み)ため、ここでは再加工しない
                p_concept_key: item.kind === "vocab" ? `vocab:${item.value}` : `reduction:${item.value}`,
                p_category: item.kind,
                p_display_label: item.value,
              })
            )
          );
          weakPointResults.forEach((result, i) => {
            if (result.status === "rejected") {
              console.error(`[listening/turns] upsert_weak_point failed for ${items[i].value}:`, result.reason);
            } else if (result.value.error) {
              console.error(
                `[listening/turns] upsert_weak_point RPC error for ${items[i].value}:`,
                result.value.error
              );
            }
          });
        }

        const history = [
          ...turns.map((t) => ({ role: t.role, turnType: t.turnType, content: t.content })),
          { role: "user" as const, turnType: userTurnType, content: text },
        ];

        const ai4 = await generateAi4Turn({
          scenario: {
            title: scenario.title,
            situationBrief: scenario.situationBrief,
            targetVocab: scenario.targetVocab,
            targetReductions: scenario.targetReductions,
            stayCloseToScript: scenario.isOnboarding,
          },
          history,
          incomingTurnType: type === "clarification" ? "user_clarification" : "user_reply",
          learnerLevel,
        });
        const targetItemsUsed = sanitizeTargetItemsUsed(ai4.targetItemsUsed);
        const aiTurnType = type === "clarification" ? "ai_clarification_response" : "utterance";

        const { data: aiTurnRow, error: aiTurnError } = await supabase
          .from("listening_turns")
          .insert({
            session_id: sessionId,
            user_id: user.id,
            turn_index: nextIndex + 1,
            role: "ai",
            turn_type: aiTurnType,
            content: ai4.utteranceText,
            target_items_used: targetItemsUsed,
            clarification_strategy: ai4.clarificationStrategy,
          })
          .select("id")
          .single();
        if (aiTurnError || !aiTurnRow) {
          throw aiTurnError ?? new Error("listening_turns insert returned no row");
        }

        const newFailedStreak = type === "clarification" ? priorFailedStreak + 1 : 0;

        return {
          turnCapReached: false as const,
          turn: {
            id: aiTurnRow.id as string,
            content: ai4.utteranceText,
            turnType: aiTurnType,
            clarificationStrategy: ai4.clarificationStrategy,
            audioRate: turnAudioRate(scenario.baseRate, ai4.clarificationStrategy),
          },
          revealAllowed: newFailedStreak >= 2,
        };
      } catch (innerError) {
        if (turnCost > 0) {
          try {
            await refundCredit(supabase, user.id, turnCost, "listening_turn_refund");
          } catch (refundError) {
            console.error("[listening/turns] refundCredit threw:", refundError);
          }
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
