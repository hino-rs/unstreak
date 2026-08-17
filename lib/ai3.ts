import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { anthropic } from "@/lib/anthropic";
import type { LevelLabel } from "@/lib/level";

export type Ai3TourPageInput = {
  heading: string;
  groundingBody: string;
  focusX: number;
  focusY: number;
  zoom: number;
};

export type Ai3NoticeableElementInput = { label: string; noticed: boolean };

export type Ai3Request = {
  title: string;
  background: string;
  intent: string;
  interpretations: string[];
  noticeableElements: Ai3NoticeableElementInput[];
  tourPages: Ai3TourPageInput[];
  round1Text: string;
  learnerLevel: LevelLabel;
};

export type Ai3Response = {
  noticedText: string | null;
  missedText: string | null;
  tourPageHeadings: string[];
  tourPageBodies: string[];
};

const Ai3ToolInputSchema = z.object({
  noticed_text: z
    .string()
    .nullable()
    .describe(
      "英語で、ユーザーがRound1で気づけた要素についての1文。気づけた要素が1つもない場合はnull"
    ),
  missed_text: z
    .string()
    .nullable()
    .describe(
      "英語で、ユーザーがRound1で見落とした要素についての1文。見落とした要素が1つもない場合はnull"
    ),
  tour_page_headings: z
    .array(z.string())
    .describe(
      "各ツアーページの英語の見出し。渡されたtour_pagesと同じ順序・同じ件数で返すこと"
    ),
  tour_page_bodies: z
    .array(z.string())
    .describe(
      "各ツアーページの英語の解説本文。渡されたtour_pagesと同じ順序・同じ件数で返すこと"
    ),
});

const TOOL_NAME = "submit_curation";

// 学習者レベル別の語彙難度パラグラフ。intermediateは元のハードコード文言をそのまま流用(挙動変化なし)
const VOCAB_TIER_PARAGRAPH: Record<LevelLabel, string> = {
  beginner: `# 英文のレベル
初〜中級の英語学習者向けです。平易で短めの文を中心にしつつ、
絵画鑑賞に必要な最低限の語彙(例: composition, symbol, scene)は使ってよいですが、
専門用語(symbolism, allegory, patron等)は避けるか、文中で意味が分かるように説明を添えてください。`,
  intermediate: `# 英文のレベル
中〜上級の英語学習者向けです。平易すぎる英語にする必要はありません。むしろ構図・象徴・技法など
絵画鑑賞ならではの語彙(例: symbolism, allegory, patron, composition, propaganda, idealize等)を
自然な文脈の中で積極的に使ってください。ただし専門用語だけの羅列にせず、意味が文脈から推測できるように書くこと。`,
  advanced: `# 英文のレベル
上級の英語学習者向けです。絵画史・美術批評で使われる専門語彙(symbolism, allegory, patron,
propaganda, idealize, iconography等)や複雑な構文(関係詞節、分詞構文、倒置等)を積極的に使い、
ネイティブの美術批評に近い自然さ・情報密度を目指してください。`,
};

function buildSystemPrompt(learnerLevel: LevelLabel): string {
  return `あなたは英語学習アプリ「Unstreak」の絵画ドリルにおけるキュレーター(AI3)です。
ユーザーは英語学習者なので、noticed_text・missed_text・tour_page_headings・tour_page_bodiesは
**すべて英語**で書いてください(fact-baseは日本語で渡しますが、出力は英語です)。

# 絶対的な制約: 事実の捏造禁止
あなたが使ってよい事実は、これから渡すfact-base(background・intent・interpretations・各tour pageのgrounding_body)に
書かれている内容だけです。新しい年代・人物名・地名・技法・エピソードなどを一切付け加えてはいけません。
grounding_bodyに書かれている事実そのものを翻訳以上に変更・削除してもいけません。
あなたの仕事は、fact-baseの事実を保ったまま英訳しつつ、ユーザーがRound1で書いた英文(気づけた要素/見落とした要素)に応じて
語り口・導入・強調点だけを調整することです。

${VOCAB_TIER_PARAGRAPH[learnerLevel]}

# noticed_text / missed_text
noticeableElementsのうち、noticed: trueの要素があれば、その要素名に触れながら
「あなたが気づいた〇〇は、美術史家も指摘している点です」という趣旨の1文を英語で書いてください。
noticed: falseの要素があれば、その要素名に触れながら
「△△は見落としがちなポイントです」という趣旨の1文を英語で書いてください。
該当する要素が1つもない側はnullにしてください。

# tour_page_headings / tour_page_bodies
渡された各tour_pageのfocusX/focusY/zoomはページ構成の骨格として固定です(見出し・座標はあなたが決めるものではありません)。
heading・grounding_bodyの内容を保ったまま、英語のheadingとbodyとしてtour_page_headings・tour_page_bodiesに書き直してください。
最後のページ(まとめ・解釈のページであることが多い)は、ユーザーのRound1の回答内容に軽く触れながら
interpretations(複数の解釈)を紹介する書き方にしてください。
tour_page_headings・tour_page_bodiesはどちらも、渡されたtour_pagesと同じ順序・同じ件数で返してください。

# 出力
指定のツールのみを使って回答してください。それ以外のテキストは一切含めないこと。`;
}

export async function curatePaintingReveal(req: Ai3Request): Promise<Ai3Response> {
  const userContent = `# 絵画のタイトル
${req.title}

# fact-base
background: ${req.background}
intent: ${req.intent}
interpretations:
${req.interpretations.map((i) => `- ${i}`).join("\n")}

# noticeable elements (ユーザーのRound1回答との突合結果)
${req.noticeableElements.map((el) => `- ${el.label}: ${el.noticed ? "気づけた" : "見落とした"}`).join("\n")}

# tour pages (この順序・件数のまま tour_page_bodies を返すこと)
${req.tourPages
  .map((p, i) => `## page ${i}\nheading: ${p.heading}\ngrounding_body: ${p.groundingBody}`)
  .join("\n\n")}

# ユーザーのRound1回答(英語)
${req.round1Text}`;

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 4096,
    tools: [
      {
        name: TOOL_NAME,
        description: "絵画ドリルのReveal解説を返す",
        input_schema: z.toJSONSchema(Ai3ToolInputSchema) as Anthropic.Tool.InputSchema,
      },
    ],
    tool_choice: { type: "tool", name: TOOL_NAME },
    system: buildSystemPrompt(req.learnerLevel),
    messages: [{ role: "user", content: userContent }],
  });

  if (response.stop_reason === "max_tokens") {
    throw new Error("AI3の応答が途中で打ち切られました(max_tokens)");
  }

  const toolUseBlock = response.content.find(
    (block): block is Anthropic.ToolUseBlock =>
      block.type === "tool_use" && block.name === TOOL_NAME,
  );
  if (!toolUseBlock) {
    throw new Error("AI3がsubmit_curationを返しませんでした");
  }

  const rawInput =
    typeof toolUseBlock.input === "object" && toolUseBlock.input !== null
      ? (toolUseBlock.input as Record<string, unknown>)
      : {};

  const parsed = Ai3ToolInputSchema.parse(rawInput);

  if (
    parsed.tour_page_bodies.length !== req.tourPages.length ||
    parsed.tour_page_headings.length !== req.tourPages.length
  ) {
    throw new Error("AI3がtour_page_headings/tour_page_bodiesの件数を誤って返しました");
  }

  return {
    noticedText: parsed.noticed_text,
    missedText: parsed.missed_text,
    tourPageHeadings: parsed.tour_page_headings,
    tourPageBodies: parsed.tour_page_bodies,
  };
}
