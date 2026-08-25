import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { anthropic } from "@/lib/anthropic";
import type { LevelLabel } from "@/lib/level";
import type { ListeningTargetItem, ListeningTurnType } from "@/lib/listening";

export type Ai4ScenarioInput = {
  title: string;
  situationBrief: string;
  targetVocab: string[];
  targetReductions: string[];
};

export type Ai4HistoryTurn = {
  role: "ai" | "user";
  turnType: ListeningTurnType;
  content: string;
};

export type Ai4TurnType = "session_start" | "user_reply" | "user_clarification";

export type Ai4Request = {
  scenario: Ai4ScenarioInput;
  history: Ai4HistoryTurn[];
  incomingTurnType: Ai4TurnType;
  learnerLevel?: LevelLabel;
};

export type Ai4Response = {
  utteranceText: string;
  targetItemsUsed: ListeningTargetItem[];
  clarificationStrategy: "repeat" | "rephrase" | "slow_down" | null;
  naturalClose: boolean;
};

const Ai4TargetItemSchema = z.object({
  kind: z.enum(["vocab", "reduction"]),
  value: z.string(),
});

const Ai4TurnResponseSchema = z.object({
  utterance_text: z
    .string()
    .describe("あなたが次に話す英語1〜2文。書き起こしではなく、実際に声に出す自然な会話文"),
  target_items_used: z
    .array(Ai4TargetItemSchema)
    .describe(
      "この発話で実際に使ったtarget_vocab/target_reductionsの項目のみを列挙する。使っていなければ空配列"
    ),
  clarification_strategy: z
    .enum(["repeat", "rephrase", "slow_down"])
    .optional()
    .describe(
      "直前のユーザー発話が聞き返し(user_clarification)だった場合のみ指定。そのまま繰り返した(repeat)/" +
        "言い換えた(rephrase)/ゆっくり言い直した(slow_down)のいずれか"
    ),
  natural_close: z.boolean().describe("この発話でシナリオの会話を自然に締めくくるかどうか"),
});

const TOOL_NAME = "submit_ai4_turn";

function buildSystemPrompt(scenario: Ai4ScenarioInput, learnerLevel?: LevelLabel): string {
  const levelInstruction = learnerLevel
    ? `\n学習者の推定レベルは「${learnerLevel}」です。beginnerなら短く平易な文、advancedならより自然な速さ・情報密度で話してください。`
    : "";

  return `あなたは英語学習アプリ「Unstreak」のリスニング機能における会話相手役(AI4)です。
ユーザーは英語学習者で、あなたの発話を音声で聞き、テキストで返信します。あなたは決して「AIアシスタント」ではなく、
以下のシナリオの登場人物としてロールプレイを続けてください。

# シナリオ
タイトル: ${scenario.title}
状況: ${scenario.situationBrief}

# 使ってよい語彙・省略表現
target_vocab: ${scenario.targetVocab.join(", ") || "(なし)"}
target_reductions: ${scenario.targetReductions.join(", ") || "(なし)"}
これらは毎ターン無理に詰め込む必要はありません。自然な文脈で使えるときだけ使い、
使った場合はtarget_items_usedにkind("vocab"または"reduction")とvalue(使った項目そのもの)を正確に列挙してください。
使っていない項目を申告しないこと。

# 絶対的な制約
- 文法の誤りを明示的に訂正しない。自然な会話を優先すること(添削は別の機能の役割です)
- utterance_textは書き起こしではなく、実際に声に出して話す短い会話文にすること(長い説明文にしない)
- シナリオの役柄から外れて「AIとして」話さないこと
${levelInstruction}

# ユーザーが聞き返してきた場合(incoming turn typeがuser_clarification)
書き起こしを見せてはいけません。実際の会話相手のように、
そのまま繰り返す(repeat)/簡単な言い方に言い換える(rephrase)/ゆっくり言い直す(slow_down)
のいずれかで自然に対応し、どの方法を使ったかをclarification_strategyに指定してください。
それ以外のターンではclarification_strategyを指定しないでください。

# 出力
指定のツールのみを使って回答してください。それ以外のテキストは一切含めないこと。`;
}

function toAnthropicMessages(history: Ai4HistoryTurn[]): Anthropic.MessageParam[] {
  if (history.length === 0) {
    return [
      {
        role: "user",
        content: "[SESSION_START] シナリオの状況に沿って、あなたから最初の一言を話してください。",
      },
    ];
  }
  return history.map((turn) => {
    if (turn.role === "ai") {
      return { role: "assistant", content: turn.content };
    }
    const marker = turn.turnType === "clarification_request" ? "[USER_CLARIFICATION_REQUEST]" : "[USER_REPLY]";
    return { role: "user", content: `${marker} ${turn.content}` };
  });
}

export async function generateAi4Turn(req: Ai4Request): Promise<Ai4Response> {
  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 1024,
    tools: [
      {
        name: TOOL_NAME,
        description: "リスニング機能の会話相手役として次の発話を返す",
        input_schema: z.toJSONSchema(Ai4TurnResponseSchema) as Anthropic.Tool.InputSchema,
      },
    ],
    tool_choice: { type: "tool", name: TOOL_NAME },
    system: buildSystemPrompt(req.scenario, req.learnerLevel),
    messages: toAnthropicMessages(req.history),
  });

  if (response.stop_reason === "max_tokens") {
    throw new Error("AI4の応答が途中で打ち切られました(max_tokens)");
  }

  const toolUseBlock = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use" && block.name === TOOL_NAME
  );
  if (!toolUseBlock) {
    throw new Error("AI4がsubmit_ai4_turnを返しませんでした");
  }

  const rawInput =
    typeof toolUseBlock.input === "object" && toolUseBlock.input !== null
      ? (toolUseBlock.input as Record<string, unknown>)
      : {};
  const sanitizedInput = {
    ...rawInput,
    target_items_used: Array.isArray(rawInput.target_items_used) ? rawInput.target_items_used : [],
  };

  const parsed = Ai4TurnResponseSchema.parse(sanitizedInput);

  return {
    utteranceText: parsed.utterance_text,
    targetItemsUsed: parsed.target_items_used,
    clarificationStrategy: parsed.clarification_strategy ?? null,
    naturalClose: parsed.natural_close,
  };
}

// AI4の自己申告(target_items_used)をそのまま信用せず、シナリオに実在する項目だけに絞り込む。
// matchNoticeableElements(lib/paintings.ts)と同じく、AIの判定材料をそのまま信頼しない姿勢を踏襲
export function filterTargetItemsUsed(
  items: ListeningTargetItem[],
  scenario: { targetVocab: string[]; targetReductions: string[] }
): ListeningTargetItem[] {
  const vocabSet = new Set(scenario.targetVocab.map((v) => v.toLowerCase().trim()));
  const reductionSet = new Set(scenario.targetReductions.map((v) => v.toLowerCase().trim()));
  return items.filter((item) => {
    const value = item.value.toLowerCase().trim();
    return item.kind === "vocab" ? vocabSet.has(value) : reductionSet.has(value);
  });
}
