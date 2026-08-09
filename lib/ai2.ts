import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { anthropic } from "@/lib/anthropic";

const GuessRequiredSchema = z.object({
  status: z.literal("guess_required"),
  normalized_question: z.string().describe('質問を整形した短い言い方(例: "光の軌跡")'),
});

const RevealedSchema = z.object({
  status: z.literal("revealed"),
  vocab_lemma: z.string().describe("対象語・熟語の原形(小文字)"),
  user_guess: z.string().nullable().describe("ユーザーの予想。わからないマーカー時はnull"),
  was_guess_correct: z
    .boolean()
    .nullable()
    .describe("ユーザーの予想が正解だったか（正解: true, 不正解: false, スキップ/予想なし: null）"),
  answer: z.string().describe("正しい英語表現"),
  explanation: z.string().describe("1文程度の口語的な補足"),
});

const OutOfScopeSchema = z.object({
  status: z.literal("out_of_scope"),
  reason: z.enum(["sentence_correction", "grammar_question"]),
  message: z.string().describe("AI1へ誘導する短いメッセージ"),
});

const Ai2ResponseSchema = z.discriminatedUnion("status", [
  GuessRequiredSchema,
  RevealedSchema,
  OutOfScopeSchema,
]);
export type Ai2Response = z.infer<typeof Ai2ResponseSchema>;

const Ai2ToolInputSchema = z.object({
  status: z
    .enum(["guess_required", "revealed", "out_of_scope"])
    .describe("回答ステータス"),
  normalized_question: z
    .string()
    .optional()
    .describe('guess_required時の短い質問表現(例: "光の軌跡")'),
  vocab_lemma: z
    .string()
    .optional()
    .describe("revealed時の対象語・熟語の原形(小文字)"),
  user_guess: z
    .string()
    .nullable()
    .optional()
    .describe("revealed時のユーザーの予想。わからない時はnull"),
  was_guess_correct: z
    .boolean()
    .nullable()
    .optional()
    .describe("revealed時の正誤判定（正解: true, 不正解: false, スキップ/予想なし: null）"),
  answer: z
    .string()
    .optional()
    .describe("revealed時の正しい英語表現"),
  explanation: z
    .string()
    .optional()
    .describe("revealed時の1文程度の口語的な補足"),
  reason: z
    .enum(["sentence_correction", "grammar_question"])
    .optional()
    .describe("out_of_scope時の理由"),
  message: z
    .string()
    .optional()
    .describe("out_of_scope時のAI1へ誘導する短いメッセージ"),
});

const TOOL_NAME = "submit_answer";

const SYSTEM_PROMPT = `あなたは英語学習アプリ「Unstreak」の辞書相棒(AI2)です。
ユーザーが書いている最中に詰まった、単語・熟語1つについての質問だけに答えます。

# あなたが見るもの
今回のメッセージだけです。過去のやり取りの文脈は一切ありません。

# 対応する質問
- 「〇〇って英語で何て言う?」のような単語・熟語の想起
- 「この単語のスペルは〇〇であってる?」のような確認

# 対応しない質問 → out_of_scope
- 文法の質問(冠詞、時制、単複、語順など) → reason: "grammar_question"
- 一文以上の自然さ・言い換え・添削の依頼 → reason: "sentence_correction"
判断に迷ったら、単語・熟語の想起として扱わずout_of_scopeに倒してください。
out_of_scopeの場合、答えや修正案を一切作らず、AI1(添削機能)に提出するよう促すmessageだけ返してください。

# revealed / guess_required の判定
- メッセージの中に、ユーザー自身が試みた解答が既に含まれている場合
  (綴りの候補、単語の記憶違いなど)は、それをuser_guessとして抽出し、
  status: "revealed" で正誤判定(was_guess_correct: true または false)とともに返す
- メッセージの中に「私の回答: (わからないので教えてほしい)」という一文が含まれる場合は、
  ユーザーは予想を放棄しています。answer/explanation/vocab_lemmaのみ埋め、
  was_guess_correctはnull、user_guessはnullにしてください
- 上記いずれでもなく、単に答えを尋ねているだけの場合は、絶対に答えを出さず
  status: "guess_required" を返してください

explanationは1文、口語的に。授業のような解説はしない。

# 出力
指定のツールのみを使って回答してください。それ以外のテキストは一切含めないこと。`;

export async function askAi2(text: string): Promise<Ai2Response> {
  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 1024,
    tools: [
      {
        name: TOOL_NAME,
        description: "辞書相棒としての回答を返す",
        input_schema: z.toJSONSchema(Ai2ToolInputSchema) as Anthropic.Tool.InputSchema,
      },
    ],
    tool_choice: { type: "tool", name: TOOL_NAME },
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: text }],
  });

  const toolUseBlock = response.content.find(
    (block): block is Anthropic.ToolUseBlock =>
      block.type === "tool_use" && block.name === TOOL_NAME,
  );
  if (!toolUseBlock) {
    throw new Error("AI2がsubmit_answerを返しませんでした");
  }

  const rawInput =
    typeof toolUseBlock.input === "object" && toolUseBlock.input !== null
      ? (toolUseBlock.input as Record<string, unknown>)
      : {};

  if (rawInput.status === "revealed") {
    if (typeof rawInput.was_guess_correct !== "boolean" && rawInput.was_guess_correct !== null) {
      rawInput.was_guess_correct = rawInput.user_guess ? false : null;
    }
  }

  return Ai2ResponseSchema.parse(rawInput);
}

// lib/ai1.ts の toConceptKey と表記を揃える
export function toConceptKeyFromLemma(lemma: string): string {
  return `vocab:${lemma.toLowerCase().trim()}`;
}