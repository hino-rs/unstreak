import Anthropic from "@anthropic-ai/sdk";
import { z } from 'zod';
import { anthropic } from "@/utils/anthropic";

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
  corrected_text: z.string().describe('ユーザーの英文を修正した全体の英文'),
  overall_comment: z.string().describe('1〜2文程度の日本語での総評・フィードバックコメント'),
  errors: z
    .array(GradingErrorSchema)
    .describe('指摘する誤り一覧の配列。誤りがない場合は必ず空配列 [] を指定してください'),
});

export type GradingResult = z.infer<typeof GradingResultSchema>;
export type GradingError = z.infer<typeof GradingErrorSchema>;

const TOOL_NAME = 'submit_grading';

export async function gradeDescription(imageUrl: string, userText: string): Promise<GradingResult> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    tools: [
      {
        name: TOOL_NAME,
        description: '画像描写ドリルの添削結果を返す。指摘する誤りがない場合は errors に空配列 [] を指定すること。',
        input_schema: z.toJSONSchema(GradingResultSchema) as Anthropic.Tool.InputSchema,
      },
    ],
    tool_choice: { type: 'tool', name: TOOL_NAME },
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'url', url: imageUrl } },
          {
            type: 'text',
            text: `以下は画像の説明として書かれた英文です。文法・語彙の正しさを中心に添削してください。誤りがない場合は errors を空配列 [] にしてください。\n\n学習者の説明: ${userText}`,
          },
        ],
      },
    ],
  });
 
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
