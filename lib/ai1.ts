import Anthropic from "@anthropic-ai/sdk";
import { z } from 'zod';
import { anthropic } from "@/lib/anthropic";

const GradingErrorSchema = z.object({
  category: z
    .enum(['grammar', 'vocabulary', 'unnatural_phrasing', 'spelling'])
    .describe('誤りのカテゴリ（文法、語彙、不自然な表現、スペル）'),
  grammar_point: z
    .enum([
      'articles',
      'past_tense',
      'present_perfect',
      'prepositions',
      'plural_agreement',
      'subject_verb_agreement',
      'word_order',
      'comparatives',
      'conditionals',
      'modal_verbs',
      'passive_voice',
      'other',
    ])
    .optional()
    .describe("categoryが'grammar'のときのみ指定する文法項目"),
  vocab_lemma: z
    .string()
    .optional()
    .describe("categoryが'vocabulary'のときのみ指定する対象語の原形（小文字）"),
  user_fragment: z.string().describe('ユーザーが書いた元の該当箇所'),
  corrected_fragment: z.string().describe('修正後の該当箇所'),
  explanation_ja: z.string().describe('なぜ修正が必要かの日本語での簡潔な解説'),
});

const GradingResultSchema = z.object({
  errors: z
    .array(GradingErrorSchema)
    .describe('指摘する誤り一覧の配列。誤りがない場合は必ず空配列 [] を指定してください'),
  corrected_text: z.string().describe('ユーザーの英文を修正した全体の英文'),
  overall_comment: z.string().describe('1〜2文程度の日本語での総評・フィードバックコメント'),
});

export type GradingResult = z.infer<typeof GradingResultSchema>;
export type GradingError = z.infer<typeof GradingErrorSchema>;

const TOOL_NAME = 'submit_grading';

// Anthropic側がtype:'url'でURLを直接フェッチできないホスト(Wikimedia Commons等、
// リダイレクトを挟むホスト)向けに、呼び出し元でbase64化した画像も受け付ける
export type ImageInput = string | { data: string; mediaType: string };

function toImageSource(image: ImageInput): Anthropic.ImageBlockParam['source'] {
  if (typeof image === 'string') {
    return { type: 'url', url: image };
  }
  return {
    type: 'base64',
    media_type: image.mediaType as Anthropic.Base64ImageSource['media_type'],
    data: image.data,
  };
}

export async function gradeDescription(image: ImageInput, userText: string): Promise<GradingResult> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    tools: [
      {
        name: TOOL_NAME,
        description: '画像描写ドリルの添削結果を返す。指摘する誤りがない場合は errors に空配列 [] を指定すること。',
        input_schema: z.toJSONSchema(GradingResultSchema) as Anthropic.Tool.InputSchema,
      },
    ],
    tool_choice: { type: 'tool', name: TOOL_NAME },
    system: `あなたは日本人英語学習者向けの英作文添削者です。
              - 誤りは1箇所につき1エントリとして、**すべて** errors に列挙する
              - 同じ文法項目の誤りが複数箇所にあれば、箇所ごとに別エントリにする
              - overall_comment で言及した誤りは、必ず対応するエントリが errors に存在すること
              - 誤りが本当に1つもない場合に限り errors を [] にする`,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: toImageSource(image) },
          {
            type: 'text',
            text: `以下は画像の説明として書かれた英文です。文法・語彙の正しさを中心に添削してください。誤りがない場合は errors を空配列 [] にしてください。\n\n学習者の説明: ${userText}`,
          },
        ],
      },
    ],
  });

  if (response.stop_reason === 'max_tokens') {
    throw new Error('AI1の応答が途中で打ち切られました(max_tokens)');
  }
 
  const toolUseBlock = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use' && block.name === TOOL_NAME,
  );
 
  if (!toolUseBlock) {
    // tool_choiceで強制しているので通常は起きないが、念のため
    throw new Error('AI1がsubmit_gradingを返しませんでした');
  }
 
  // 万が一errorsが文字列やnullで返ってきた場合でも安全にフォールバック
  const rawInput = (typeof toolUseBlock.input === 'object' && toolUseBlock.input !== null)
  ? (toolUseBlock.input as Record<string, unknown>)
  : {};
  const sanitizedInput = {
    ...rawInput,
    errors: Array.isArray(rawInput.errors) ? rawInput.errors : [],
  };

  // ランタイム検証しつつ型を確定させる。ここを通ればGradingResultとして安全に扱える
  return GradingResultSchema.parse(sanitizedInput);
}
 
// weak_points用のキーはAI1に生成させず、こちらで機械的に組み立てて表記ゆれを防ぐ
export function toConceptKey(error: GradingError): string | null {
  if (error.category === 'grammar' && error.grammar_point) {
    return `grammar:${error.grammar_point}`;
  }
  if (error.category === 'vocabulary' && error.vocab_lemma) {
    return `vocab:${error.vocab_lemma.toLowerCase().trim()}`;
  }
  return null; // unnatural_phrasing / spelling は今回のプール対象外
}

// weak_points.display_label用のラベル辞書
const grammarPointLabels: Record<string, string> = {
  articles: '冠詞',
  past_tense: '過去形',
  present_perfect: '現在完了形',
  prepositions: '前置詞',
  plural_agreement: '単複の一致',
  subject_verb_agreement: '主語と動詞の一致',
  word_order: '語順',
  comparatives: '比較表現',
  conditionals: '仮定法・条件文',
  modal_verbs: '助動詞',
  passive_voice: '受動態',
  other: 'その他文法',
};

export function toDisplayLabel(error: GradingError): string | null {
  if (error.category === 'grammar' && error.grammar_point) {
    return grammarPointLabels[error.grammar_point] ?? error.grammar_point;
  }
  if (error.category === 'vocabulary' && error.vocab_lemma) {
    return error.vocab_lemma.toLowerCase().trim();
  }
  return null;
}
