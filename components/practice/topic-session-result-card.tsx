"use client"

import type { TopicSessionGrading, UtteranceRating } from "@/lib/ai1"
import type { TopicTurnRow } from "@/lib/topic"
import { BookCheck, CheckCircle2, CircleAlert, CircleDot } from "lucide-react"
import { cn } from "@/lib/utils"
import { GradingErrorItem } from "@/components/practice/grading-error-item"

const ratingMeta: Record<
  UtteranceRating,
  { label: string; className: string; icon: typeof CheckCircle2 }
> = {
  excellent: {
    label: "素晴らしい",
    className:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60",
    icon: CheckCircle2,
  },
  good: {
    label: "おおむね良い",
    className:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60",
    icon: CircleDot,
  },
  needs_work: {
    label: "要改善",
    className:
      "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60",
    icon: CircleAlert,
  },
}

export function TopicSessionResultCard({
  grading,
  turns,
}: {
  grading: TopicSessionGrading
  turns: TopicTurnRow[]
}) {
  // turn_indexで評価を引けるようにしておく(AI1が発言を取りこぼしても表示は壊さない)
  const evaluationByTurnIndex = new Map(
    grading.utterances.map((u) => [u.turn_index, u])
  )

  return (
    <div className="space-y-6">
      {/* 会話全体への総評 */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-primary mb-1.5">
          <BookCheck className="size-4" />
          <span>会話全体の総評</span>
        </div>
        <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
          {grading.overall_comment}
        </p>
      </div>

      {/* 会話ログ + 発言ごとの評価 */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          会話の振り返り
        </h3>

        <div className="space-y-4">
          {turns.map((turn) => {
            if (turn.role === "ai5") {
              return (
                <div key={turn.id} className="flex justify-start">
                  <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-muted px-4 py-2.5 text-sm leading-relaxed text-foreground">
                    {turn.content}
                  </div>
                </div>
              )
            }

            const evaluation = evaluationByTurnIndex.get(turn.turnIndex)
            const meta = evaluation ? ratingMeta[evaluation.rating] : null
            const RatingIcon = meta?.icon

            return (
              <div key={turn.id} className="flex flex-col items-end gap-1.5">
                <div className="flex max-w-[85%] flex-col items-end gap-1.5">
                  <div className="rounded-2xl rounded-tr-sm bg-primary/10 px-4 py-2.5 text-sm leading-relaxed text-foreground">
                    {turn.content}
                  </div>
                  {meta && RatingIcon && (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium",
                        meta.className
                      )}
                    >
                      <RatingIcon className="size-3" />
                      {meta.label}
                    </span>
                  )}
                </div>

                {/* 最高評価以外は、その場で指摘と訂正案を開く */}
                {evaluation && evaluation.errors.length > 0 && (
                  <div className="w-full space-y-2.5 sm:w-[85%]">
                    {evaluation.errors.map((err, idx) => (
                      <GradingErrorItem key={idx} error={err} />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
