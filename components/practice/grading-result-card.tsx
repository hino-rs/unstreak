"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import type { GradingResult } from "@/lib/ai1"
import { CheckCircle2, BookCheck, Check, Copy } from "lucide-react"
import { GradingErrorItem } from "@/components/practice/grading-error-item"

// 指摘1件分の表示とラベル辞書はgrading-error-item.tsxへ移した
// (トピック説明の会話版の結果表示と共有するため)。既存の参照を壊さないよう再エクスポートする
export { categoryLabels, grammarPointLabels } from "@/components/practice/grading-error-item"

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
            {result.errors.map((err, idx) => (
              <GradingErrorItem key={idx} error={err} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
