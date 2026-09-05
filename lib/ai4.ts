import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { anthropic, logAiUsage } from "@/lib/anthropic";
import type { LevelLabel } from "@/lib/level";
import type { ListeningTargetItem, ListeningTurnType } from "@/lib/listening";

export type Ai4ScenarioInput = {
  title: string;
  situationBrief: string;
  targetVocab: string[];
  targetReductions: string[];
  // ウォームアップ(is_onboarding)シナリオ用。trueの時は台本から自由に逸脱させず、
  // 短く・平易に・ほぼ台本通りに固定する(揺らぎ機能をこのシナリオだけオフにする)
  stayCloseToScript?: boolean;
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
    .max(5)
    .describe(
      "この発話でユーザーが聞き取りにくい可能性のある語彙・連結/省略発音(gonna, wanna等)を全て列挙する。" +
        "target_vocab/target_reductionsに入っているかどうかは問わない。使っていなければ空配列"
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
    ? `\n学習者の推定レベルは「${learnerLevel}」です。beginnerなら短く平易な文、advancedならより自然な速さ・情報密度で話してください。` +
      "変化をつける場合も、このレベル帯から大きく逸脱する語彙・構文には飛躍しないこと。"
    : "";

  return `あなたは英語学習アプリ「Unstreak」のリスニング機能における会話相手役(AI4)です。
ユーザーは英語学習者で、あなたの発話を音声で聞き、テキストで返信します。あなたは決して「AIアシスタント」ではなく、
以下のシナリオの登場人物としてロールプレイを続けてください。

# シナリオ
タイトル: ${scenario.title}
状況: ${scenario.situationBrief}

${
  scenario.stayCloseToScript
    ? `# 語彙・省略表現(このシナリオは初めて使う人向けの足慣らしです)
target_vocab: ${scenario.targetVocab.join(", ") || "(なし)"}
target_reductions: ${scenario.targetReductions.join(", ") || "(なし)"}
このシナリオは初心者の最初の一歩です。**台本から逸脱せず**、上記のtarget_vocab付近の平易な語彙のみを使い、
省略発音(gonna/wanna等)は一切使わないでください。1発話は1文・5〜8語程度に収め、短く明瞭に話してください。
毎回同じような簡単なやり取りで構いません(バリエーションより分かりやすさを優先)。`
    : `# 参考語彙・省略表現(あくまで出発点、縛られなくてよい)
target_vocab: ${scenario.targetVocab.join(", ") || "(なし)"}
target_reductions: ${scenario.targetReductions.join(", ") || "(なし)"}
これらは会話のきっかけとして使ってよいですが、**同じシナリオでも毎回同じ流れ・同じセリフにならないように**、
このリストにない自然な語彙・言い回し・展開も積極的に混ぜてください。話す内容・切り口を会話ごとに変えることを優先し、
台本通りに進める必要はありません。`
}

# target_items_used
この発話でユーザーが聞き取りにくい可能性のある語彙・連結/省略発音(gonna, wanna, kinda等)を全て報告してください。
target_vocab/target_reductionsに入っているかどうかは問いません。リストにない語彙・省略発音を使った場合でも、
実際に使ったものは正直に申告してください(kindは"vocab"または"reduction"、valueは使った項目そのもの)。
使っていなければ空配列にしてください。

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
    // プロンプトキャッシュは入れていない。Haiku 4.5 はキャッシュ最小prefixが4096トークンと
    // 突出して高い(Opus 5は512、Sonnet 5は1024)。実測でprefix(tools+system)は約2,650トークン。履歴は1ターン約25トークンずつしか伸びないので、
    // 24ターンの上限まで会話しても約3,250トークンにしかならず、最後まで4096に届かない。
    // cache_control を付けてもエラーにならず黙って無効化されるだけなので、あえて付けない。
    // モデルを乗り換えるかsystemが大幅に伸びたら再検討すること
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

  logAiUsage("ai4.generateTurn", "claude-haiku-4-5", response.usage);

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

const MAX_ITEM_VALUE_LENGTH = 40;
const MAX_ITEMS_PER_TURN = 5;

// AI4はシナリオの台本(target_vocab/target_reductions)に縛られず自由に展開してよい設計にしたため、
// ここでの検証はもう「固定リストへの一致チェック」ではない。自己申告をそのまま弱点プールに書き込んでも
// 壊れたデータにならないための軽いサニタイズ(トリム・重複排除・長さ上限・件数上限)のみ行う
export function sanitizeTargetItemsUsed(items: ListeningTargetItem[]): ListeningTargetItem[] {
  const seen = new Set<string>();
  const result: ListeningTargetItem[] = [];
  for (const item of items) {
    const value = item.value.toLowerCase().trim();
    if (!value || value.length > MAX_ITEM_VALUE_LENGTH) continue;
    const key = `${item.kind}:${value}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ kind: item.kind, value });
    if (result.length >= MAX_ITEMS_PER_TURN) break;
  }
  return result;
}
