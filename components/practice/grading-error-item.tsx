"use client"

import type { GradingError } from "@/lib/ai1"
import { ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

// 指摘1件分の表示。画像描写ドリル(1本の提出文)とトピック説明(発言ごと)の
// 両方から使うため、GradingResultCardから切り出した共通部品
export const categoryLabels: Record<
  GradingError["category"],
  { label: string; className: string }
> = {
  grammar: {
    label: "文法",
    className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60",
  },
  vocabulary: {
    label: "語彙",
    className: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/60",
  },
  unnatural_phrasing: {
    label: "不自然な表現",
    className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60",
  },
  spelling: {
    label: "スペル",
    className: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60",
  },
}

const leveltStageLabels: Record<NonNullable<GradingError["levelt_stage"]>, string> = {
  lexical_selection: "語彙選択でつまずいた",
  grammatical_encoding: "文法の組み立てでつまずいた",
}

export const grammarPointLabels: Record<string, string> = {
  articles: "冠詞",
  past_tense: "過去形",
  present_perfect: "現在完了形",
  prepositions: "前置詞",
  plural_agreement: "単複の一致",
  subject_verb_agreement: "主語と動詞の一致",
  word_order: "語順",
  comparatives: "比較表現",
  conditionals: "仮定法・条件文",
  modal_verbs: "助動詞",
  passive_voice: "受動態",
  other: "その他文法",
}

export function GradingErrorItem({ error: err }: { error: GradingError }) {
  const cat = categoryLabels[err.category]
  const grammarLabel =
    err.grammar_point && grammarPointLabels[err.grammar_point]
      ? grammarPointLabels[err.grammar_point]
      : err.grammar_point

  return (
    <div className="rounded-xl border border-border bg-card p-3.5 space-y-2.5 shadow-2xs">
      <div className="flex flex-wrap items-center gap-1.5">
        <span
          className={cn(
            "inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border",
            cat?.className
          )}
        >
          {cat?.label ?? err.category}
        </span>
        {grammarLabel && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-secondary text-secondary-foreground">
            {grammarLabel}
          </span>
        )}
        {err.vocab_lemma && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-muted text-muted-foreground">
            単語: {err.vocab_lemma}
          </span>
        )}
      </div>

      {/* フレーズ比較 */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm bg-muted/40 rounded-lg p-2.5">
        <span className="line-through text-rose-600 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-400 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-900/60 break-all text-xs">
          {err.user_fragment}
        </span>
        <ArrowRight className="size-3.5 text-muted-foreground shrink-0 hidden sm:block" />
        <span className="font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-900/60 break-all text-xs">
          {err.corrected_fragment}
        </span>
      </div>

      {/* 解説 */}
      <p className="text-xs text-muted-foreground leading-relaxed pl-0.5">
        {err.levelt_stage && (
          <span className="font-medium text-foreground">
            {leveltStageLabels[err.levelt_stage]}：
          </span>
        )}
        {err.explanation_ja}
      </p>

      {/* 言い換え例(Pro限定の詳細添削でのみ返ってくる) */}
      {err.alternative_phrasings && err.alternative_phrasings.length > 0 && (
        <div className="pl-0.5 space-y-1">
          <span className="text-[11px] font-semibold text-muted-foreground">
            言い換え例
          </span>
          <ul className="space-y-1">
            {err.alternative_phrasings.map((phrase, i) => (
              <li
                key={i}
                className="text-xs text-foreground bg-muted/40 rounded-lg px-2.5 py-1.5 border border-border/60"
              >
                {phrase}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
