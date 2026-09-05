import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { anthropic, logAiUsage } from "@/lib/anthropic";
import type { LevelLabel } from "@/lib/level";
import type { SubscriptionPlan } from "@/lib/credits";
import type { TopicProfile } from "@/lib/topic";

export type Ai5HistoryTurn = {
  role: "ai5" | "user";
  content: string;
};

export type Ai5Request = {
  profile: TopicProfile;
  history: Ai5HistoryTurn[];
  learnerLevel?: LevelLabel;
  // 会話の質がこの機能の価値そのものなので、Proだけ一段上のモデルを使う。
  // docs/トピック説明設計.md「3. モデル選定」参照
  plan: SubscriptionPlan | null;
};

const Ai5TurnResponseSchema = z.object({
  utterance: z
    .string()
    .describe(
      "あなたが次に話す英語1〜3文。相手の職業・趣味や直前の回答に踏み込む質問を必ず1つ含める、自然な会話文"
    ),
});

const TOOL_NAME = "submit_ai5_turn";

// Free/Standard=Sonnet、Pro=Opus。原価試算もこの2モデルの単価で出している
export function ai5ModelForPlan(plan: SubscriptionPlan | null): string {
  return plan === "pro" ? "claude-opus-5" : "claude-sonnet-5";
}

function buildSystemPrompt(profile: TopicProfile, learnerLevel?: LevelLabel): string {
  const levelInstruction = learnerLevel
    ? `\n学習者の推定レベルは「${learnerLevel}」です。beginnerなら短く平易な質問、advancedならより抽象的で答えごたえのある質問にしてください。` +
      "ただしレベル帯から大きく逸脱する語彙・構文には飛躍しないこと。"
    : "";

  return `あなたは英語学習アプリ「Unstreak」のトピック説明機能における会話相手役(AI5)です。
ユーザーは英語学習者で、あなたの質問に英語で答えます。あなたの仕事は、相手が「自分の言葉で英語を組み立てて話す」時間を
できるだけ長く作ることです。

# 相手のプロフィール
職業: ${profile.occupation}
趣味: ${profile.hobbies}

# 会話の進め方
- 上記の職業・趣味に本当に興味を持っている人として、具体的に掘り下げてください
- 1回の発話は英語1〜3文。必ず質問を1つ含め、相手が答える番で終わること
- 「はい/いいえ」で終わる質問ではなく、説明・描写・意見を引き出す質問にすること
- 相手の直前の回答の中身に反応してから次の質問へ進むこと(一般的な質問を並べるだけにしない)
- 同じ話題が続いて広がらなくなったら、プロフィールの別の側面へ自然に移ること

# 絶対的な制約(最重要)
- **文法・語彙の誤りを絶対に訂正しない。指摘も評価もしない。**言い直しを促すこともしない
- 相手の英語が不自然でも、意味が分かる限りそのまま受け止めて会話を進めること
- 添削はセッション終了後に別の担当(AI1)がまとめて行います。会話中に指摘されると相手は話すこと自体をやめてしまうため、
  ここでの訂正は機能全体の設計思想に反します
- 「Good job」「Nice English」のような英語そのものへの評価・褒めもしないこと(内容への相づちは自然な範囲でよい)
- あなたから会話を終わらせないこと。終了はユーザーが決めます。締めくくりの挨拶や「またね」で終わらせないでください
- 日本語で話さないこと。発話はすべて英語にすること${levelInstruction}

# 出力
指定のツールのみを使って回答してください。それ以外のテキストは一切含めないこと。`;
}

function toAnthropicMessages(history: Ai5HistoryTurn[]): Anthropic.MessageParam[] {
  if (history.length === 0) {
    return [
      {
        role: "user",
        content:
          "[SESSION_START] 相手のプロフィール(職業・趣味)を踏まえて、あなたから最初の質問を1つ投げかけてください。",
      },
    ];
  }
  return history.map((turn) =>
    turn.role === "ai5"
      ? ({ role: "assistant", content: turn.content } as const)
      : ({ role: "user", content: turn.content } as const)
  );
}

// トピック説明は毎ターン全履歴を再送する構造なので、直近ターンの末尾に breakpoint を置くと
// 次のターンが「前ターンまでの履歴」をキャッシュから読める(読み出しは通常入力の約1/10の単価)。
// TTLは5分。学習者が英文を組み立てる時間が5分を超えるとそのターンはミスするが、
// ミスしても通常課金に戻るだけで壊れはしない
function withHistoryCacheBreakpoint(
  messages: Anthropic.MessageParam[]
): Anthropic.MessageParam[] {
  const last = messages[messages.length - 1];
  if (!last || typeof last.content !== "string") return messages;
  return [
    ...messages.slice(0, -1),
    {
      role: last.role,
      content: [
        { type: "text", text: last.content, cache_control: { type: "ephemeral" } },
      ],
    },
  ];
}

export async function generateAi5Turn(req: Ai5Request): Promise<{ utterance: string }> {
  const response = await anthropic.messages.create({
    model: ai5ModelForPlan(req.plan),
    // 発話自体は英語1〜3文だが、Sonnet 5もOpus 5もthinkingがデフォルトONで、thinkingトークンは
    // max_tokensを消費する。1024のままだと思考だけで枠を使い切って下のthrowに落ち、会話が途中で切れる。
    // 実際に生成した分しか課金されないので、枠を広く取ること自体のコストはない
    max_tokens: 4096,
    tools: [
      {
        name: TOOL_NAME,
        description: "トピック説明機能の会話相手役として次の発話を返す",
        input_schema: z.toJSONSchema(Ai5TurnResponseSchema) as Anthropic.Tool.InputSchema,
      },
    ],
    tool_choice: { type: "tool", name: TOOL_NAME },
    // systemにはプロフィール(職業・趣味)が埋まるのでprefixはユーザーごとに分かれるが、
    // 1セッション内では不変なのでセッションを通してヒットし続ける。tools -> system の順に
    // レンダリングされるため、このbreakpointはツールスキーマごとキャッシュする
    system: [
      {
        type: "text",
        text: buildSystemPrompt(req.profile, req.learnerLevel),
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: withHistoryCacheBreakpoint(toAnthropicMessages(req.history)),
  });

  logAiUsage("ai5.generateTurn", ai5ModelForPlan(req.plan), response.usage);

  if (response.stop_reason === "max_tokens") {
    throw new Error("AI5の応答が途中で打ち切られました(max_tokens)");
  }

  const toolUseBlock = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use" && block.name === TOOL_NAME
  );
  if (!toolUseBlock) {
    throw new Error("AI5がsubmit_ai5_turnを返しませんでした");
  }

  const parsed = Ai5TurnResponseSchema.parse(toolUseBlock.input);

  return { utterance: parsed.utterance.trim() };
}
