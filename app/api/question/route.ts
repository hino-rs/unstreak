import { NextRequest, NextResponse } from "next/server";
import { createSupabaseClient } from "@/lib/supabase/server";
import { askAi2, toConceptKeyFromLemma } from "@/lib/ai2";
import { checkRateLimit, withConcurrencyLock, ConcurrencyLimitError } from "@/lib/rate-limit";
import { CREDIT_COSTS, InsufficientCreditsError, consumeCredit } from "@/lib/credits";

type QuestionRequest =
  | { mode: "ask"; text: string }
  | { mode: "answer"; question: string; guess: string }
  | { mode: "skip"; question: string };

const MAX_FIELD_LENGTH = 500;

function isValidQuestionRequest(body: unknown): body is QuestionRequest {
  if (typeof body !== "object" || body === null) return false;
  const b = body as Record<string, unknown>;
  const isShortString = (v: unknown) =>
    typeof v === "string" && v.length > 0 && v.length <= MAX_FIELD_LENGTH;

  if (b.mode === "ask") return isShortString(b.text);
  if (b.mode === "answer") return isShortString(b.question) && isShortString(b.guess);
  if (b.mode === "skip") return isShortString(b.question);
  return false;
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const rateLimitResult = await checkRateLimit(user.id);
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: "too many requests" },
      { status: 429, headers: { "Retry-After": String(rateLimitResult.retryAfterSeconds) } },
    );
  }

  const rawBody: unknown = await req.json();
  if (!isValidQuestionRequest(rawBody)) {
    return NextResponse.json({ error: "invalid request body" }, { status: 400 });
  }
  const body: QuestionRequest = rawBody;

  const promptText =
    body.mode === "ask"
      ? body.text
      : body.mode === "answer"
        ? `質問: ${body.question}\n私の予想: ${body.guess}`
        : `質問: ${body.question}\n私の回答: (わからないので教えてほしい)`;

  let result;
  try {
    result = await withConcurrencyLock(user.id, async () => {
      const aiResult = await askAi2(promptText);
      // guess_requiredは「まず予想して」と促すだけで実質的な回答を返していないため無課金。
      // revealed/out_of_scopeのときだけ課金する(質問する行為自体は常に無料に保つ設計)。
      // consumeCreditをAI呼び出し成功後に行うため、ここで残高不足が判明してもAI応答自体の
      // 再試行コストはかからず、単に402を返して結果を破棄するだけで済む(返金処理も不要)。
      if (aiResult.status !== "guess_required") {
        await consumeCredit(supabase, user.id, CREDIT_COSTS.question, "question");
      }
      return aiResult;
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

  // guess_requiredはDBに書かず、クライアントに予想入力を促すだけ
  if (result.status === "guess_required") {
    // answer/skipモードでも起きうる(モデルが埋め込み予想を認識し損ねた場合)。
    // クライアント側で無限ループにならないよう、フォールバック表示を用意しておく
    return NextResponse.json(result);
  }

  if (result.status === "out_of_scope") {
    return NextResponse.json(result);
  }

  // ここから status === "revealed"
  // skipはユーザー操作として確定しているので、モデルの出力に関わらずAPI側で強制する
  const wasGuessCorrect = body.mode === "skip" ? null : result.was_guess_correct;
  const userGuess =
    body.mode === "skip" ? null : body.mode === "answer" ? body.guess : result.user_guess;
  const conceptKey = toConceptKeyFromLemma(result.vocab_lemma);

  const { error: insertError } = await supabase.from("ai2_queries").insert({
    user_id: user.id,
    concept_key: conceptKey,
    question_text: body.mode === "ask" ? body.text : body.question,
    user_guess: userGuess,
    revealed_answer: result.answer,
    was_guess_correct: wasGuessCorrect,
  });
  if (insertError) console.error("[question] revealed insert failed:", insertError);

  // 正解した予想はweak_pointsに入れない(README通り、詰まったものだけを狙い撃ちする設計のため)
  if (wasGuessCorrect !== true) {
    const { error: rpcError } = await supabase.rpc("upsert_weak_point", {
      p_user_id: user.id,
      p_concept_key: conceptKey,
      p_category: "vocabulary",
      p_display_label: result.vocab_lemma,
    });
    if (rpcError) console.error("[question] upsert_weak_point failed:", rpcError);
  }

  return NextResponse.json({
    ...result,
    was_guess_correct: wasGuessCorrect,
    user_guess: userGuess,
  });
}
