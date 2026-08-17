"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import type { GradingResult, GradingError } from "@/lib/ai1"
import { CheckCircle2, ArrowRight, BookCheck, Check, Copy } from "lucide-react"
import { cn } from "@/lib/utils"

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

export function GradingResultCard({ result }: { result: GradingResult }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-5">
      {/* 総評コメント */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-primary mb-1.5">
          <BookCheck className="size-4" />
          <span>総評</span>
        </div>
        <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
          {result.overall_comment}
        </p>
      </div>

      {/* 修正済みフルテキスト */}
      <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground">
            修正後の英文
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => handleCopy(result.corrected_text)}
          >
            {copied ? (
              <>
                <Check className="mr-1 size-3.5 text-emerald-600" />
                コピー完了
              </>
            ) : (
              <>
                <Copy className="mr-1 size-3.5" />
                コピー
              </>
            )}
          </Button>
        </div>
        <p className="text-sm font-medium leading-relaxed text-foreground bg-background rounded-lg p-3 border border-border/80">
          {result.corrected_text}
        </p>
      </div>

      {/* 指摘・添削一覧 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            指摘・改善ポイント ({result.errors.length}件)
          </h3>
        </div>

        {result.errors.length === 0 ? (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-emerald-900 dark:bg-emerald-950/30 dark:border-emerald-800/60 dark:text-emerald-300">
            <CheckCircle2 className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <div>
              <p className="text-sm font-semibold">素晴らしい！</p>
              <p className="text-xs text-emerald-700 dark:text-emerald-400/90 mt-0.5">
                文法や語彙のエラーは見つかりませんでした。とても自然な英文です。
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            {result.errors.map((err, idx) => {
              const cat = categoryLabels[err.category]
              const grammarLabel =
                err.grammar_point && grammarPointLabels[err.grammar_point]
                  ? grammarPointLabels[err.grammar_point]
                  : err.grammar_point

              return (
                <div
                  key={idx}
                  className="rounded-xl border border-border bg-card p-3.5 space-y-2.5 shadow-2xs"
                >
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
                    {err.explanation_ja}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
