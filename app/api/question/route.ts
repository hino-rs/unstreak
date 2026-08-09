import { NextRequest, NextResponse } from "next/server";
import { createSupabaseClient } from "@/lib/supabase/server";
import { askAi2, toConceptKeyFromLemma } from "@/lib/ai2";

type QuestionRequest =
  | { mode: "ask"; text: string }
  | { mode: "answer"; question: string; guess: string }
  | { mode: "skip"; question: string };

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body: QuestionRequest = await req.json();

  const promptText =
    body.mode === "ask"
      ? body.text
      : body.mode === "answer"
        ? `質問: ${body.question}\n私の予想: ${body.guess}`
        : `質問: ${body.question}\n私の回答: (わからないので教えてほしい)`;

  const result = await askAi2(promptText);

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
