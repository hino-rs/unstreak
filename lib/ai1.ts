import Anthropic from "@anthropic-ai/sdk";
import { z } from 'zod';
import { anthropic, logAiUsage } from "@/lib/anthropic";
import type { LevelLabel } from "@/lib/level";

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
  // Pro会員向け詳細添削でのみ埋める。Standard/Freeでは省略させる(出力トークン節約のため)
  levelt_stage: z
    .enum(['lexical_selection', 'grammatical_encoding'])
    .optional()
    .describe(
      "詳細添削が有効な場合のみ設定。Leveltの発話生成モデルに基づき、categoryが'vocabulary'なら" +
      "'lexical_selection'(語彙選択の問題)、'grammar'なら'grammatical_encoding'(文法組立の問題)を設定。" +
      "それ以外のcategoryや詳細添削が無効な場合は省略する"
    ),
  alternative_phrasings: z
    .array(z.string())
    .optional()
    .describe(
      '詳細添削が有効な場合のみ設定。corrected_fragmentとは別の、より自然な言い換え候補を1〜2個。' +
      '詳細添削が無効な場合は省略する'
    ),
});

const GradingResultSchema = z.object({
  errors: z
    .array(GradingErrorSchema)
    .describe('指摘する誤り一覧の配列。誤りがない場合は必ず空配列 [] を指定してください'),
  corrected_text: z.string().describe('ユーザーの英文を修正した全体の英文'),
  overall_comment: z.string().describe('1〜2文程度の日本語での総評・フィードバックコメント'),
  // lib/level.ts の LevelLabel と値を一致させること(EWMAでlevel_scoreに畳み込む)
  level_estimate: z
    .enum(['beginner', 'intermediate', 'advanced'])
    .describe(
      '学習者の英語力を3段階で判定する。語彙の幅、文の複雑さ（節構造・接続表現の使用）、' +
      '文の長さに対する誤りの密度から総合的に判断すること。誤りの有無だけで判断しないこと' +
      '（誤りが少なくても平易な単文のみならbeginner寄り、誤りがあっても複雑な構文・幅広い語彙を' +
      '使っていればintermediate/advanced寄りになりうる）。'
    ),
});

export type GradingResult = z.infer<typeof GradingResultSchema>;
export type GradingError = z.infer<typeof GradingErrorSchema>;

const TOOL_NAME = 'submit_grading';

// キャッシュ対象の固定prefix。ここに可変値を入れるとプロンプトキャッシュが分裂するので、
// 学習者ごとに変わる指示は呼び出し側の第2ブロックに置くこと
const DESCRIBE_GRADING_RULES = `あなたは日本人英語学習者向けの英作文添削者です。
              - 誤りは1箇所につき1エントリとして、**すべて** errors に列挙する
              - 同じ文法項目の誤りが複数箇所にあれば、箇所ごとに別エントリにする
              - overall_comment で言及した誤りは、必ず対応するエントリが errors に存在すること
              - 誤りが本当に1つもない場合に限り errors を [] にする
              - level_estimate は誤りの有無ではなく、語彙・構文の複雑さと誤り密度から総合的に判定する`;

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

export async function gradeDescription(
  image: ImageInput,
  userText: string,
  learnerLevel?: LevelLabel,
  detailed = false,
): Promise<GradingResult> {
  const levelInstruction = learnerLevel
    ? `\n              - この学習者の推定レベルは「${learnerLevel}」です。corrected_text と各errorのexplanation_ja は、
              このレベルに合わせた語彙・表現の複雑さにしてください（beginner: 平易な語彙・短い文優先、
              advanced: より高度な語彙・自然な言い換えも許容）。ただし添削の正確さ・誤り検出は
              レベルに関わらず一切妥協しないこと。`
    : '';

  const detailedInstruction = detailed
    ? `\n              - 各errorについて levelt_stage（'vocabulary'なら'lexical_selection'、'grammar'なら
              'grammatical_encoding'）と、corrected_fragmentとは別の自然な言い換え候補1〜2個を
              alternative_phrasingsに設定すること。`
    : `\n              - levelt_stage と alternative_phrasings は省略すること（設定しない）。`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-5',
    // Sonnet 5はthinkingを省略するとadaptiveがデフォルトで走り、thinkingトークンがmax_tokensを消費する
    // (Sonnet 4.6は省略=thinkingオフだった)。加えて新トークナイザでトークン数自体も増える(本番同等の
    // プロンプトをcount_tokensで実測して+6.9%)。4.6時代の4096のままだと打ち切られて
    // stop_reason='max_tokens'で下のthrowに落ちるため、倍に引き上げている
    max_tokens: 8192,
    thinking: { type: 'adaptive' },
    // 添削は誤りを漏れなく列挙する想起重視のタスクで、取りこぼしがそのまま学習価値の毀損になる。
    // lowは指示に忠実な反面この種のタスクで浅くなりうるため、mediumを採用(≒Sonnet 4.6のhigh相当)
    output_config: { effort: 'medium' },
    tools: [
      {
        name: TOOL_NAME,
        description: '画像描写ドリルの添削結果を返す。指摘する誤りがない場合は errors に空配列 [] を指定すること。',
        input_schema: z.toJSONSchema(GradingResultSchema) as Anthropic.Tool.InputSchema,
      },
    ],
    tool_choice: { type: 'tool', name: TOOL_NAME },
    // tools -> system -> messages の順にレンダリングされるので、system先頭ブロックのbreakpointは
    // ツールスキーマ(この呼び出しの固定入力の大半)ごとキャッシュする。可変部(levelInstruction /
    // detailedInstruction)を同じブロックに混ぜるとレベル3種×detailed2種=6通りのprefixに分裂し
    // ヒット率が1/6になるため、必ず後続の別ブロックに置くこと
    system: [
      { type: 'text', text: DESCRIBE_GRADING_RULES, cache_control: { type: 'ephemeral' } },
      { type: 'text', text: `${levelInstruction}${detailedInstruction}` },
    ],
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

  logAiUsage('ai1.gradeDescription', 'claude-sonnet-5', response.usage);

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
    level_estimate: ['beginner', 'intermediate', 'advanced'].includes(rawInput.level_estimate as string)
      ? rawInput.level_estimate
      : 'intermediate', // 判定不能時はEWMAを大きく振らせないよう中庸にフォールバック
  };

  // ランタイム検証しつつ型を確定させる。ここを通ればGradingResultとして安全に扱える
  return GradingResultSchema.parse(sanitizedInput);
}
 
// ============================================================
// トピック説明(会話ドリル)の添削。1本の連続したテキストではなく、会話全体を
// 「発言ごと」に評価する点だけが画像描写ドリルと違う。誤り1件の構造(GradingErrorSchema)は
// 参照範囲がその1発言に狭まるだけなので、そのまま流用する。
// ============================================================

// 3段階。LevelLabel(beginner/intermediate/advanced)やリスニングTierと同じ粒度に揃えた
const UtteranceRatingSchema = z.enum(['excellent', 'good', 'needs_work']);

const TopicUtteranceEvaluationSchema = z.object({
  turn_index: z
    .number()
    .describe('評価対象のユーザー発言に振られている番号。入力の [turn_index] をそのまま使うこと'),
  rating: UtteranceRatingSchema.describe(
    'excellent: 直すべき点がなく自然。good: 意味は通るが不自然さ・軽微な誤りがある。' +
    'needs_work: 文法/語彙の誤りが意味の伝達を妨げている'
  ),
  errors: z
    .array(GradingErrorSchema)
    .describe(
      'この発言に対する指摘。rating が excellent の場合のみ空配列 [] にすること。' +
      'good / needs_work の場合は必ず1件以上入れること'
    ),
});

const TopicSessionGradingSchema = z.object({
  overall_comment: z
    .string()
    .describe(
      '会話全体についての2〜4文程度の日本語での総評。個々の文法ミスの列挙ではなく、' +
      '会話の流れ・話題への踏み込み方・言いたいことを英語で組み立てられていたかに触れること'
    ),
  utterances: z
    .array(TopicUtteranceEvaluationSchema)
    .describe('ユーザーの発言すべてを、入力に現れた順で漏れなく評価する'),
  level_estimate: z
    .enum(['beginner', 'intermediate', 'advanced'])
    .describe(
      '学習者の英語力を3段階で判定する。語彙の幅、文の複雑さ、誤りの密度に加えて、' +
      '会話の中で自分から話を広げられているかも加味すること'
    ),
});

export type TopicSessionGrading = z.infer<typeof TopicSessionGradingSchema>;
export type TopicUtteranceEvaluation = z.infer<typeof TopicUtteranceEvaluationSchema>;
export type UtteranceRating = z.infer<typeof UtteranceRatingSchema>;

const TOPIC_TOOL_NAME = 'submit_topic_grading';

// キャッシュ対象の固定prefix(注意点は DESCRIBE_GRADING_RULES と同じ)
const TOPIC_GRADING_RULES = `あなたは日本人英語学習者向けの英会話添削者です。AIとの英語の会話ログを読み、**ユーザーの発言だけ**を添削します。
              - USER [turn_index=N] の行だけが添削対象。AI: の行は文脈を読むためのもので、評価してはいけない
              - ユーザーの発言は1つ残らず utterances に含める。turn_index は入力に書かれている数字をそのまま使う
              - 誤りは1箇所につき1エントリとして errors に列挙する。user_fragment はその発言の中の文字列にすること
              - rating が excellent のときだけ errors を空配列にする
              - 会話なので、多少の口語表現・短い返答は不自然とみなさない。書き言葉の基準で過剰に減点しないこと
              - overall_comment は個々のミスの列挙ではなく、会話全体としての手応えを日本語で書く`;

export type TopicTranscriptTurn = {
  turnIndex: number;
  role: 'ai5' | 'user';
  content: string;
};

export async function gradeTopicSession(
  transcript: TopicTranscriptTurn[],
  profile: { occupation: string; hobbies: string },
  learnerLevel?: LevelLabel,
  detailed = false,
): Promise<TopicSessionGrading> {
  const levelInstruction = learnerLevel
    ? `\n              - この学習者の推定レベルは「${learnerLevel}」です。explanation_ja はこのレベルに合わせた
              説明にしてください。ただし誤り検出の正確さはレベルに関わらず妥協しないこと。`
    : '';

  const detailedInstruction = detailed
    ? `\n              - 各errorについて levelt_stage（'vocabulary'なら'lexical_selection'、'grammar'なら
              'grammatical_encoding'）と、corrected_fragmentとは別の自然な言い換え候補1〜2個を
              alternative_phrasingsに設定すること。`
    : `\n              - levelt_stage と alternative_phrasings は省略すること（設定しない）。`;

  const conversation = transcript
    .map((turn) =>
      turn.role === 'ai5'
        ? `AI: ${turn.content}`
        : `USER [turn_index=${turn.turnIndex}]: ${turn.content}`,
    )
    .join('\n');

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-5',
    // 会話ログ全体の発言を1つ残らず添削する=出力が最も長くなる呼び出し。
    // thinking分＋新トークナイザ分の余裕を見て倍にしている(理由の詳細はgradeDescription側のコメント参照)
    max_tokens: 16384,
    thinking: { type: 'adaptive' },
    output_config: { effort: 'medium' },
    tools: [
      {
        name: TOPIC_TOOL_NAME,
        description:
          'トピック説明(会話ドリル)の添削結果を返す。ユーザーの発言ごとに評価と指摘を返すこと。',
        input_schema: z.toJSONSchema(TopicSessionGradingSchema) as Anthropic.Tool.InputSchema,
      },
    ],
    tool_choice: { type: 'tool', name: TOPIC_TOOL_NAME },
    // 分割の理由は gradeDescription 側のコメント参照
    system: [
      { type: 'text', text: TOPIC_GRADING_RULES, cache_control: { type: 'ephemeral' } },
      { type: 'text', text: `${levelInstruction}${detailedInstruction}` },
    ],
    messages: [
      {
        role: 'user',
        content: `以下は英語学習者(USER)とAIの会話ログです。学習者の職業は「${profile.occupation}」、趣味は「${profile.hobbies}」です。
USERの発言をそれぞれ添削してください。

${conversation}`,
      },
    ],
  });

  logAiUsage('ai1.gradeTopicSession', 'claude-sonnet-5', response.usage);

  if (response.stop_reason === 'max_tokens') {
    throw new Error('AI1の応答が途中で打ち切られました(max_tokens)');
  }

  const toolUseBlock = response.content.find(
    (block): block is Anthropic.ToolUseBlock =>
      block.type === 'tool_use' && block.name === TOPIC_TOOL_NAME,
  );

  if (!toolUseBlock) {
    throw new Error('AI1がsubmit_topic_gradingを返しませんでした');
  }

  const rawInput = (typeof toolUseBlock.input === 'object' && toolUseBlock.input !== null)
    ? (toolUseBlock.input as Record<string, unknown>)
    : {};

  // 発言単位のerrorsが欠けていても画面が壊れないよう、配列でないものは空配列に寄せる
  const rawUtterances = Array.isArray(rawInput.utterances) ? rawInput.utterances : [];
  const sanitizedInput = {
    ...rawInput,
    utterances: rawUtterances.map((u) => {
      const utterance = (typeof u === 'object' && u !== null) ? (u as Record<string, unknown>) : {};
      return {
        ...utterance,
        errors: Array.isArray(utterance.errors) ? utterance.errors : [],
      };
    }),
    level_estimate: ['beginner', 'intermediate', 'advanced'].includes(rawInput.level_estimate as string)
      ? rawInput.level_estimate
      : 'intermediate',
  };

  return TopicSessionGradingSchema.parse(sanitizedInput);
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
