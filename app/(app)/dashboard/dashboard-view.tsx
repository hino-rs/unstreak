"use client"

import React, { useState } from "react"
import Image from "next/image"
import {
  Activity as ActivityIcon,
  TrendingUp,
  TrendingDown,
  Image as ImageIcon,
  Target,
  Sparkles,
  CheckCircle2,
  Copy,
  Check,
  BookCheck,
  ArrowRight,
  Calendar,
  Layers,
  MessageSquare,
  Palette,
} from "lucide-react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts"

import { cn } from "@/lib/utils"
import { Marquee } from "@/components/ui/marquee"
import { BentoGrid, BentoCard } from "@/components/ui/bento-grid"
import { NumberTicker } from "@/components/ui/number-ticker"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AspectRatio } from "@/components/ui/aspect-ratio"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import type { GradingResult } from "@/lib/ai1"

export type QueryHistoryItem = {
  id: string
  questionText: string
  userGuess: string | null
  revealedAnswer: string
  wasGuessCorrect: boolean | null
  createdAt: string
}

export type DailyAccuracyPoint = {
  date: string // e.g. "8/10"
  fullDate: string // e.g. "2026-08-10"
  accuracy: number // 0-100
  questions: number
  correct: number
}

export type GuessStats = {
  percent: number
  lastWeekPercent: number | null
  diffPercent: number | null
  totalCount: number
  lastWeekCount: number
  correctCount: number
  incorrectCount: number
  skipCount: number
  dailyTrend: DailyAccuracyPoint[]
  recentQueries: QueryHistoryItem[]
}

export type Activity = {
  numOfDrillAttempts: number
  lastDrillAttemptDate: string
  numOfQuestions: number
  lastQuestionDate: string
  recentDrillAttempts: Drill[]
  recentQueries: QueryHistoryItem[]
}

export type WeakLabelCount = { label: string; count: number }

export type Drill = {
  url: string
  attemptDate: string
  submittedText?: string
  gradingResult?: GradingResult | null
  numErrors: number
}

export type PaintingProgressItem = {
  slug: string
  title: string
  imageUrl: string
  completed: boolean
}

export type PaintingProgress = {
  completed: number
  total: number
  paintings: PaintingProgressItem[]
}

export type DashboardData = {
  guessStats: GuessStats
  recentActivity: Activity
  weaknessFocus: WeakLabelCount[]
  recentDrillResults: Drill[]
  paintingProgress: PaintingProgress
}

const chartConfig = {
  accuracy: {
    label: "予測正解率",
    color: "#8b5cf6",
  },
} satisfies ChartConfig

const categoryLabels: Record<
  string,
  { label: string; className: string }
> = {
  grammar: {
    label: "文法",
    className: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/40",
  },
  vocabulary: {
    label: "語彙",
    className: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/40",
  },
  unnatural_phrasing: {
    label: "不自然な表現",
    className: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40",
  },
  spelling: {
    label: "スペル",
    className: "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/40",
  },
}

const grammarPointLabels: Record<string, string> = {
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

function formatDate(dateStr: string): string {
  if (!dateStr) return "未実施"
  try {
    const d = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffHours < 1) {
      return "たった今"
    }
    if (diffHours < 24) {
      return `${diffHours}時間前`
    }
    if (diffDays === 1) {
      return "昨日"
    }
    if (diffDays < 7) {
      return `${diffDays}日前`
    }
    return `${d.getMonth() + 1}月${d.getDate()}日`
  } catch {
    return dateStr
  }
}

function formatFullDate(dateStr: string): string {
  if (!dateStr) return ""
  try {
    const d = new Date(dateStr)
    return d.toLocaleString("ja-JP", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return dateStr
  }
}

const fallbackDrills: Drill[] = [
  {
    url: "https://images.unsplash.com/photo-1517849845537-4d257902454a?w=600&q=80",
    attemptDate: new Date().toISOString(),
    submittedText: "A cute dog is looking at the camera on the yellow grass.",
    gradingResult: {
      overall_comment: "自然で正確な描写です。冠詞と前置詞も適切に使えています。",
      corrected_text: "A cute dog is looking at the camera on the yellow grass.",
      errors: [],
      level_estimate: "intermediate",
    },
    numErrors: 0,
  },
  {
    url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&q=80",
    attemptDate: new Date(Date.now() - 86400000).toISOString(),
    submittedText: "There is a beautiful mountain with lake in the morning.",
    gradingResult: {
      overall_comment: "情景がよく伝わります。可算名詞の前には冠詞をつける点に注意しましょう。",
      corrected_text: "There is a beautiful mountain with a lake in the morning.",
      errors: [
        {
          category: "grammar",
          grammar_point: "articles",
          user_fragment: "with lake",
          corrected_fragment: "with a lake",
          explanation_ja: "lake（湖）は数えられる名詞（可算名詞）なので、不定冠詞の a が必要です。",
        },
      ],
      level_estimate: "intermediate",
    },
    numErrors: 1,
  },
  {
    url: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=600&q=80",
    attemptDate: new Date(Date.now() - 172800000).toISOString(),
    submittedText: "Foggy forest landscape with green pine trees.",
    gradingResult: {
      overall_comment: "名詞句として簡潔に風景を表現できています。",
      corrected_text: "A foggy forest landscape with green pine trees.",
      errors: [],
      level_estimate: "intermediate",
    },
    numErrors: 0,
  },
]

/* =========================================================================
   1. ドリル添削履歴モーダル (DrillDetailModal)
   ========================================================================= */
interface DrillDetailModalProps {
  drill: Drill | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function DrillDetailModal({ drill, open, onOpenChange }: DrillDetailModalProps) {
  const [copied, setCopied] = useState(false)

  if (!drill) return null

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const result = drill.gradingResult
  const errors = result?.errors ?? []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl md:max-w-3xl lg:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="size-5 text-primary" />
              <DialogTitle className="text-lg font-bold">ドリル添削履歴</DialogTitle>
            </div>
            {drill.attemptDate && (
              <Badge variant="outline" className="flex items-center gap-1 font-mono text-xs font-normal">
                <Calendar className="size-3 text-muted-foreground" />
                <span>{formatFullDate(drill.attemptDate)}</span>
              </Badge>
            )}
          </div>
          <DialogDescription>
            過去に提出した画像描写ドリルとAIによる添削・フィードバックです
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 py-2 items-start">
          {/* 左側カラム: 画像 ＆ ユーザーの解答文 */}
          <div className="md:col-span-5 space-y-3.5">
            <AspectRatio ratio={16 / 10} className="rounded-xl bg-muted overflow-hidden relative border border-border shadow-xs">
              <Image
                src={drill.url}
                alt="提出画像"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 400px"
              />
            </AspectRatio>

            <div className="flex flex-col gap-1.5 bg-muted/40 p-3.5 rounded-xl border border-border/70 text-xs shadow-2xs">
              <span className="font-semibold text-muted-foreground">あなたの解答文:</span>
              <p className="text-foreground leading-relaxed italic bg-background/90 p-3 rounded-lg border border-border/50">
                "{drill.submittedText || "（解答テキストなし）"}"
              </p>
            </div>
          </div>

          {/* 右側カラム: AI総評・修正文・改善ポイント */}
          <div className="md:col-span-7 space-y-3.5">
            {result ? (
              <>
                {/* 総評コメント */}
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 shadow-2xs">
                  <div className="flex items-center gap-2 text-xs font-semibold text-primary mb-1">
                    <BookCheck className="size-4" />
                    <span>総評</span>
                  </div>
                  <p className="text-xs leading-relaxed text-foreground whitespace-pre-wrap">
                    {result.overall_comment}
                  </p>
                </div>

                {/* 修正済み英文 */}
                <div className="rounded-xl border border-border bg-muted/40 p-3.5 shadow-2xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      修正後の英文
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => handleCopy(result.corrected_text)}
                    >
                      {copied ? (
                        <>
                          <Check className="mr-1 size-3 text-green-600" />
                          コピー完了
                        </>
                      ) : (
                        <>
                          <Copy className="mr-1 size-3" />
                          コピー
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-xs font-medium leading-relaxed text-foreground bg-background rounded-lg p-2.5 border border-border">
                    {result.corrected_text}
                  </p>
                </div>

                {/* 指摘・改善ポイント一覧 */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-foreground">
                      指摘・改善ポイント ({errors.length}件)
                    </h4>
                  </div>

                  {errors.length === 0 ? (
                    <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-3 text-green-800 dark:bg-green-950/30 dark:text-green-300 dark:border-green-800/40">
                      <CheckCircle2 className="size-5 shrink-0 text-green-600" />
                      <div>
                        <p className="text-xs font-semibold">素晴らしい！</p>
                        <p className="text-[11px] text-green-700 dark:text-green-400">
                          文法や語彙のエラーは見つかりませんでした。自然な英文です。
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {errors.map((err, idx) => {
                        const cat = categoryLabels[err.category]
                        const grammarLabel =
                          err.grammar_point && grammarPointLabels[err.grammar_point]
                            ? grammarPointLabels[err.grammar_point]
                            : err.grammar_point

                        return (
                          <div
                            key={idx}
                            className="rounded-xl border border-border bg-card p-3 space-y-2 shadow-2xs text-xs"
                          >
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${cat?.className}`}
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
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs bg-muted/30 rounded-lg p-2">
                              <span className="line-through text-red-600 bg-red-50 dark:bg-red-950/40 dark:text-red-300 px-2 py-0.5 rounded border border-red-100 dark:border-red-900/30 break-all">
                                {err.user_fragment}
                              </span>
                              <ArrowRight className="size-3.5 text-muted-foreground shrink-0 hidden sm:block" />
                              <span className="font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-100 dark:border-emerald-900/30 break-all">
                                {err.corrected_fragment}
                              </span>
                            </div>

                            {/* 解説 */}
                            <p className="text-[11px] text-muted-foreground leading-relaxed pl-0.5">
                              {err.explanation_ja}
                            </p>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="p-4 rounded-xl bg-muted/30 text-center text-xs text-muted-foreground">
                添削詳細データがありません
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="pt-3 border-t border-border">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            閉じる
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* =========================================================================
   2. 直近のアクティビティ詳細モーダル (RecentActivityModal)
   ========================================================================= */
interface RecentActivityModalProps {
  activity: Activity
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectDrill: (drill: Drill) => void
}

function RecentActivityModal({
  activity,
  open,
  onOpenChange,
  onSelectDrill,
}: RecentActivityModalProps) {
  const totalActions = activity.numOfDrillAttempts + activity.numOfQuestions
  const drills = activity.recentDrillAttempts ?? []
  const queries = activity.recentQueries ?? []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl md:max-w-3xl lg:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ActivityIcon className="size-5 text-indigo-600" />
              <DialogTitle className="text-lg font-bold">直近のアクティビティ詳細</DialogTitle>
            </div>
            <Badge variant="secondary" className="text-xs font-normal">
              直近7日間の活動ログ
            </Badge>
          </div>
          <DialogDescription>
            画像説明ドリルの提出履歴と、AI2への質問ログの一覧です
          </DialogDescription>
        </DialogHeader>

        {/* サマリー指標バー */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-1">
          <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
            <div className="text-[11px] text-muted-foreground">総アクション数</div>
            <div className="text-xl font-bold mt-0.5">
              {totalActions} <span className="text-xs font-normal text-muted-foreground">回</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-200/60 dark:bg-blue-950/20 dark:border-blue-800/30">
            <div className="text-[11px] text-blue-700 dark:text-blue-400 font-medium">ドリル提出</div>
            <div className="text-xl font-bold mt-0.5 text-blue-900 dark:text-blue-200">
              {activity.numOfDrillAttempts} <span className="text-xs font-normal text-muted-foreground">回</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-violet-50/50 border border-violet-200/60 dark:bg-violet-950/20 dark:border-violet-800/30">
            <div className="text-[11px] text-violet-700 dark:text-violet-400 font-medium">AI2への質問</div>
            <div className="text-xl font-bold mt-0.5 text-violet-900 dark:text-violet-200">
              {activity.numOfQuestions} <span className="text-xs font-normal text-muted-foreground">回</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
            <div className="text-[11px] text-muted-foreground">最終アクティビティ</div>
            <div className="text-sm font-semibold mt-1 truncate">
              {formatDate(activity.lastDrillAttemptDate || activity.lastQuestionDate)}
            </div>
          </div>
        </div>

        {/* 2カラム横長コンテンツエリア */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 py-2 items-start">
          {/* 左側: 画像説明ドリル履歴 */}
          <div className="md:col-span-6 space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-border/60">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <ImageIcon className="size-4 text-blue-600" />
                <span>画像説明ドリル ({drills.length}件)</span>
              </div>
              <span className="text-[10px] text-muted-foreground">クリックで添削詳細</span>
            </div>

            {drills.length > 0 ? (
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {drills.map((drill, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      onOpenChange(false)
                      onSelectDrill(drill)
                    }}
                    className="w-full text-left p-2.5 rounded-xl bg-card border border-border/70 hover:border-primary/50 hover:shadow-xs transition-all flex items-start gap-3 group cursor-pointer"
                  >
                    <div className="relative size-14 rounded-lg overflow-hidden shrink-0 border border-border bg-muted">
                      <Image
                        src={drill.url}
                        alt="ドリルサムネイル"
                        fill
                        className="object-cover group-hover:scale-105 transition-transform"
                        sizes="56px"
                      />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[11px] font-medium text-muted-foreground">
                          {formatDate(drill.attemptDate)}
                        </span>
                        <span
                          className={cn(
                            "text-[10px] font-semibold px-1.5 py-0.5 rounded",
                            drill.numErrors === 0
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400"
                              : "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-400"
                          )}
                        >
                          {drill.numErrors === 0 ? "ミス 0件" : `ミス ${drill.numErrors}件`}
                        </span>
                      </div>
                      <p className="text-xs text-foreground line-clamp-1 italic">
                        "{drill.submittedText || "（解答文）"}"
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-8 rounded-xl bg-muted/20 border border-dashed border-border text-center text-xs text-muted-foreground">
                <ImageIcon className="size-6 text-muted-foreground/50 mx-auto mb-1.5" />
                <p>直近7日間のドリル提出はありません</p>
              </div>
            )}
          </div>

          {/* 右側: AI2質問履歴 */}
          <div className="md:col-span-6 space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-border/60">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <MessageSquare className="size-4 text-violet-600" />
                <span>AI2 質問ログ ({queries.length}件)</span>
              </div>
              <span className="text-[10px] text-muted-foreground">単語想起履歴</span>
            </div>

            {queries.length > 0 ? (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {queries.map((q) => (
                  <div
                    key={q.id}
                    className="p-2.5 rounded-xl bg-card border border-border/70 space-y-1.5 text-xs shadow-2xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-foreground truncate">{q.revealedAnswer}</span>
                      {q.wasGuessCorrect === true ? (
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-900/40 shrink-0">
                          正解
                        </span>
                      ) : q.wasGuessCorrect === false ? (
                        <span className="text-[10px] font-semibold text-rose-700 bg-rose-50 dark:bg-rose-950/30 dark:text-rose-400 px-1.5 py-0.5 rounded border border-rose-200 dark:border-rose-900/40 shrink-0">
                          不正解
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
                          スキップ
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] text-muted-foreground flex items-center justify-between">
                      <span className="truncate">Q: {q.questionText}</span>
                      <span className="shrink-0 font-mono text-[10px]">{formatDate(q.createdAt)}</span>
                    </div>

                    {q.userGuess && (
                      <div className="text-[11px] bg-muted/40 px-2 py-1 rounded border border-border/50">
                        <span className="text-muted-foreground">予想: </span>
                        <span
                          className={
                            q.wasGuessCorrect
                              ? "text-emerald-700 dark:text-emerald-400 font-medium"
                              : "text-rose-700 dark:text-rose-400 line-through"
                          }
                        >
                          {q.userGuess}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 rounded-xl bg-muted/20 border border-dashed border-border text-center text-xs text-muted-foreground">
                <MessageSquare className="size-6 text-muted-foreground/50 mx-auto mb-1.5" />
                <p>直近7日間のAI2への質問はありません</p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="pt-3 border-t border-border">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            閉じる
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* =========================================================================
   3. 予測成功率推移・想起分析モーダル (GuessAccuracyModal)
   ========================================================================= */
interface GuessAccuracyModalProps {
  stats: GuessStats
  open: boolean
  onOpenChange: (open: boolean) => void
}

function GuessAccuracyModal({ stats, open, onOpenChange }: GuessAccuracyModalProps) {
  const percent = Math.round(stats.percent)
  const queries = stats.recentQueries ?? []
  const dailyTrend = stats.dailyTrend ?? []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl md:max-w-3xl lg:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="size-5 text-violet-600" />
              <DialogTitle className="text-lg font-bold">予測成功率の分析・推移グラフ</DialogTitle>
            </div>
            <Badge variant="secondary" className="text-xs font-normal">
              想起トレーニング
            </Badge>
          </div>
          <DialogDescription>
            AI2への単語・熟語質問時に、正解・不正解・スキップした履歴と正解率の推移です
          </DialogDescription>
        </DialogHeader>

        {/* サマリー指標バー */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 py-1">
          <div className="p-3 rounded-xl bg-violet-50/70 border border-violet-200/80 dark:bg-violet-950/30 dark:border-violet-800/40 sm:col-span-1 col-span-2">
            <div className="text-[11px] text-violet-700 dark:text-violet-400 font-medium">今週の正解率</div>
            <div className="text-2xl font-black mt-0.5 text-violet-950 dark:text-violet-200">
              {percent} <span className="text-sm font-bold text-violet-600">%</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
            <div className="text-[11px] text-muted-foreground">先週比</div>
            <div className="text-xl font-bold mt-0.5 flex items-center gap-1">
              {stats.diffPercent !== null ? (
                <span
                  className={
                    stats.diffPercent > 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : stats.diffPercent < 0
                      ? "text-rose-600 dark:text-rose-400"
                      : "text-foreground"
                  }
                >
                  {stats.diffPercent > 0 ? `+${stats.diffPercent}%` : `${stats.diffPercent}%`}
                </span>
              ) : (
                <span className="text-xs font-normal text-muted-foreground">比較データなし</span>
              )}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
            <div className="text-[11px] text-muted-foreground">今週の質問数</div>
            <div className="text-xl font-bold mt-0.5">
              {stats.totalCount} <span className="text-xs font-normal text-muted-foreground">回</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-200/60 dark:bg-emerald-950/20 dark:border-emerald-800/30">
            <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">正解</div>
            <div className="text-xl font-bold mt-0.5 text-emerald-900 dark:text-emerald-200">
              {stats.correctCount} <span className="text-xs font-normal text-muted-foreground">回</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-rose-50/50 border border-rose-200/60 dark:bg-rose-950/20 dark:border-rose-800/30">
            <div className="text-[11px] text-rose-700 dark:text-rose-400 font-medium">不正解</div>
            <div className="text-xl font-bold mt-0.5 text-rose-900 dark:text-rose-200">
              {stats.incorrectCount} <span className="text-xs font-normal text-muted-foreground">回</span>
            </div>
          </div>
        </div>

        {/* 2カラム横長コンテンツエリア */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 py-2 items-start">
          {/* 左側: 推移チャート ＆ 評価 */}
          <div className="md:col-span-6 space-y-3.5">
            {/* 推移チャート */}
            <div className="p-4 rounded-xl bg-card border border-border/70 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">日別 正解率の推移</span>
                <span className="text-[10px] text-muted-foreground">※ 記録があった日のみ表示</span>
              </div>

              <div className="h-44 w-full">
                {dailyTrend.length > 0 ? (
                  <ChartContainer config={chartConfig} className="h-full w-full aspect-auto">
                    <AreaChart
                      data={dailyTrend}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="modalFillAccuracy" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                      <XAxis
                        dataKey="date"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={6}
                        fontSize={10}
                      />
                      <YAxis
                        domain={[0, 100]}
                        tickLine={false}
                        axisLine={false}
                        fontSize={10}
                        tickFormatter={(val) => `${val}%`}
                      />
                      <ChartTooltip
                        cursor={{ stroke: "rgba(139, 92, 246, 0.4)", strokeWidth: 1 }}
                        content={
                          <ChartTooltipContent
                            labelFormatter={(value) => `${value}の記録`}
                            formatter={(value, name, item) => (
                              <div className="flex flex-col gap-0.5">
                                <span className="font-bold text-violet-600 dark:text-violet-400">
                                  正解率: {value}%
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                  ({item.payload.correct}問正解 / {item.payload.questions}問中)
                                </span>
                              </div>
                            )}
                          />
                        }
                      />
                      <Area
                        dataKey="accuracy"
                        type="monotone"
                        fill="url(#modalFillAccuracy)"
                        stroke="#8b5cf6"
                        strokeWidth={2.5}
                        dot={{ fill: "#8b5cf6", r: 3.5, strokeWidth: 1.5, stroke: "#fff" }}
                        activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }}
                      />
                    </AreaChart>
                  </ChartContainer>
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-muted/20 rounded-lg border border-dashed border-border text-xs text-muted-foreground">
                    グラフデータがまだありません
                  </div>
                )}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-muted/40 border border-border/70 space-y-1.5 text-xs">
              <div className="font-semibold text-foreground flex items-center gap-1.5">
                <BookCheck className="size-3.5 text-primary" />
                <span>想起（Retrieval）学習のコツ</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                わからない単語でも、当てずっぽうで1度予想してから答え合わせを行うことで、脳内の語彙ネットワークが活性化し、定着率が大幅に上がります。
              </p>
            </div>
          </div>

          {/* 右側: 質問・正誤判定ログ一覧 */}
          <div className="md:col-span-6 space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-border/60">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Layers className="size-4 text-violet-600" />
                <span>質問・想起ログ ({queries.length}件)</span>
              </div>
              <span className="text-[10px] text-muted-foreground">過去14日間</span>
            </div>

            {queries.length > 0 ? (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {queries.map((q) => (
                  <div
                    key={q.id}
                    className="p-3 rounded-xl bg-card border border-border/70 space-y-2 text-xs shadow-2xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-bold text-violet-950 dark:text-violet-200 text-sm">
                        {q.revealedAnswer}
                      </div>
                      {q.wasGuessCorrect === true ? (
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-900/40 shrink-0">
                          正解 ✓
                        </span>
                      ) : q.wasGuessCorrect === false ? (
                        <span className="text-[10px] font-semibold text-rose-700 bg-rose-50 dark:bg-rose-950/30 dark:text-rose-400 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-900/40 shrink-0">
                          不正解 ✕
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full shrink-0">
                          スキップ
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] text-muted-foreground flex items-center justify-between">
                      <span className="truncate">質問: {q.questionText}</span>
                      <span className="shrink-0 font-mono text-[10px]">{formatDate(q.createdAt)}</span>
                    </div>

                    {q.userGuess && (
                      <div className="text-[11px] bg-muted/40 p-2 rounded-lg border border-border/50 flex items-center justify-between">
                        <span className="text-muted-foreground">あなたの予想:</span>
                        <span
                          className={
                            q.wasGuessCorrect
                              ? "text-emerald-700 dark:text-emerald-400 font-semibold"
                              : "text-rose-700 dark:text-rose-400 line-through font-semibold"
                          }
                        >
                          {q.userGuess}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 rounded-xl bg-muted/20 border border-dashed border-border text-center text-xs text-muted-foreground">
                <TrendingUp className="size-6 text-muted-foreground/50 mx-auto mb-1.5" />
                <p>まだ質問履歴がありません</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  右側のAI2辞書相棒に質問するとここに記録されます
                </p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="pt-3 border-t border-border">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            閉じる
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* =========================================================================
   メイン DashboardView
   ========================================================================= */
export function DashboardView({ initialData }: { initialData: DashboardData }) {
  const [selectedDrill, setSelectedDrill] = useState<Drill | null>(null)
  const [isDrillModalOpen, setIsDrillModalOpen] = useState(false)
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false)
  const [isAccuracyModalOpen, setIsAccuracyModalOpen] = useState(false)

  const guessStats = initialData.guessStats
  const guessCorrectPercent = guessStats.percent
  const recentActivity = initialData.recentActivity
  const recentDrillResults = initialData.recentDrillResults
  const weaknessFocus = initialData.weaknessFocus
  const paintingProgress = initialData.paintingProgress

  const displayDrills =
    recentDrillResults.length > 0 ? recentDrillResults : fallbackDrills

  const chartData = guessStats.dailyTrend ?? []

  const handleDrillClick = (drill: Drill) => {
    setSelectedDrill(drill)
    setIsDrillModalOpen(true)
  }

  const features = [
    {
      Icon: ActivityIcon,
      name: "直近のアクティビティ",
      description: "直近7日間のドリル提出とAI2への質問状況です",
      cta: "詳しく見る",
      onClickCta: () => setIsActivityModalOpen(true),
      className: "col-span-3 md:col-span-3 lg:col-span-1",
      background: (
        <div className="relative w-full h-full flex flex-col justify-center gap-2">
          {/* Ambient Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-36 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex flex-col gap-2 relative z-10">
            {/* Action 1: Drill */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border/60 shadow-2xs">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center font-medium shrink-0">
                  <ImageIcon className="size-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-foreground">画像説明ドリル</div>
                  <div className="text-[11px] text-muted-foreground">
                    提出: <span className="font-bold text-foreground">{recentActivity.numOfDrillAttempts}</span> 回
                  </div>
                </div>
              </div>
              <Badge variant="secondary" className="text-[10px] font-normal shrink-0">
                {formatDate(recentActivity.lastDrillAttemptDate)}
              </Badge>
            </div>

            {/* Action 2: AI2 Questions */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border/60 shadow-2xs">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-lg bg-violet-500/10 text-violet-600 flex items-center justify-center font-medium shrink-0">
                  <Sparkles className="size-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-foreground">AI2 辞書相棒</div>
                  <div className="text-[11px] text-muted-foreground">
                    質問: <span className="font-bold text-foreground">{recentActivity.numOfQuestions}</span> 回
                  </div>
                </div>
              </div>
              <Badge variant="secondary" className="text-[10px] font-normal shrink-0">
                {formatDate(recentActivity.lastQuestionDate)}
              </Badge>
            </div>
          </div>
        </div>
      ),
    },
    {
      Icon: TrendingUp,
      name: "予測成功率の推移",
      description: "AI2への質問時、自分の予想が当たった割合の推移です",
      cta: "詳しく見る",
      onClickCta: () => setIsAccuracyModalOpen(true),
      className: "col-span-3 md:col-span-3 lg:col-span-2",
      background: (
        <div className="relative w-full h-full flex flex-col justify-between py-1">
          {/* Ambient Glow */}
          <div className="absolute top-1/2 right-6 -translate-y-1/2 size-48 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Top Row: Metric & Comparison Badge */}
          <div className="flex items-center justify-between gap-3 relative z-10 px-1">
            <div className="flex items-baseline gap-2">
              <div className="flex items-baseline">
                <NumberTicker
                  value={Math.round(guessCorrectPercent)}
                  className="text-4xl md:text-5xl font-black tracking-tight text-foreground"
                />
                <span className="text-xl md:text-2xl font-bold text-violet-600 dark:text-violet-400 ml-0.5">%</span>
              </div>

              {/* 先週比バッジ */}
              {guessStats.diffPercent !== null ? (
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[11px] font-semibold flex items-center gap-0.5 px-2 py-0.5",
                    guessStats.diffPercent > 0
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40"
                      : guessStats.diffPercent < 0
                      ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/40"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {guessStats.diffPercent > 0 ? (
                    <>
                      <TrendingUp className="size-3" />
                      先週比 +{guessStats.diffPercent}%
                    </>
                  ) : guessStats.diffPercent < 0 ? (
                    <>
                      <TrendingDown className="size-3" />
                      先週比 {guessStats.diffPercent}%
                    </>
                  ) : (
                    "先週比 ±0%"
                  )}
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-[10px] text-muted-foreground font-normal">
                  先週データなし
                </Badge>
              )}
            </div>

            <span className="text-[11px] text-muted-foreground font-medium hidden sm:inline-block">
              直近7日: {guessStats.totalCount}問中{guessStats.correctCount}問正解
            </span>
          </div>

          {/* Chart Area */}
          <div className="w-full h-28 relative z-10">
            {chartData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-full w-full aspect-auto">
                <AreaChart
                  data={chartData}
                  margin={{ top: 8, right: 12, left: 12, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="fillAccuracy" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="#8b5cf6"
                        stopOpacity={0.4}
                      />
                      <stop
                        offset="95%"
                        stopColor="#8b5cf6"
                        stopOpacity={0.0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.3} />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={4}
                    fontSize={10}
                  />
                  <YAxis domain={[0, 100]} hide />
                  <ChartTooltip
                    cursor={{ stroke: "rgba(139, 92, 246, 0.4)", strokeWidth: 1 }}
                    content={
                      <ChartTooltipContent
                        labelFormatter={(value) => `${value}の記録`}
                        formatter={(value, name, item) => (
                          <div className="flex flex-col gap-0.5">
                            <span className="font-bold text-violet-600 dark:text-violet-400">
                              正解率: {value}%
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              ({item.payload.correct}問正解 / {item.payload.questions}問中)
                            </span>
                          </div>
                        )}
                      />
                    }
                  />
                  <Area
                    dataKey="accuracy"
                    type="monotone"
                    fill="url(#fillAccuracy)"
                    stroke="#8b5cf6"
                    strokeWidth={2.5}
                    dot={{ fill: "#8b5cf6", r: 3.5, strokeWidth: 1.5, stroke: "#fff" }}
                    activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }}
                  />
                </AreaChart>
              </ChartContainer>
            ) : (
              <div className="h-full w-full flex items-center justify-center bg-muted/20 rounded-xl border border-dashed border-border text-xs text-muted-foreground">
                <Sparkles className="size-4 text-violet-500 mr-1.5" />
                質問すると日別の正解率グラフが表示されます
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      Icon: ImageIcon,
      name: "直近のドリル履歴",
      description: "直近に提出した画像描写ドリルです（クリックで添削結果を確認できます）",
      href: "/practice/describe",
      cta: "ドリル画面へ",
      className: "col-span-3 md:col-span-3 lg:col-span-2",
      background: (
        <div className="relative w-full h-full flex items-center overflow-hidden">
          {/* Ambient Glow */}
          <div className="absolute top-1/2 left-1/3 -translate-y-1/2 size-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="w-full">
            <Marquee
              pauseOnHover
              className="[--duration:24s] [--gap:0.75rem] py-1"
            >
              {displayDrills.map((item, index) => (
                <button
                  type="button"
                  key={index}
                  onClick={() => handleDrillClick(item)}
                  className={cn(
                    "relative w-40 h-28 shrink-0 cursor-pointer overflow-hidden rounded-xl border border-border/80 bg-card shadow-xs text-left",
                    "transition-all duration-300 hover:scale-[1.03] hover:shadow-md hover:border-primary/50 group/drill focus:outline-none focus:ring-2 focus:ring-primary/40"
                  )}
                >
                  <Image
                    src={item.url}
                    alt={`ドリル履歴 ${index + 1}`}
                    fill
                    className="object-cover transition-transform duration-500 group-hover/drill:scale-105"
                    sizes="160px"
                  />
                  {/* Subtle dark gradient overlay */}
                  <div className="absolute inset-0 bg-linear-to-t from-black/75 via-black/20 to-transparent" />

                  {/* Bottom info badge */}
                  <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-white pointer-events-none">
                    <span className="text-[10px] font-medium opacity-90 truncate drop-shadow-xs">
                      {formatDate(item.attemptDate)}
                    </span>
                    <span
                      className={cn(
                        "text-[10px] font-bold px-1.5 py-0.5 rounded-md backdrop-blur-xs shadow-xs",
                        item.numErrors === 0
                          ? "bg-emerald-500/90 text-white"
                          : "bg-black/60 text-amber-300 border border-amber-400/30"
                      )}
                    >
                      {item.numErrors === 0 ? "ミス 0件" : `ミス ${item.numErrors}件`}
                    </span>
                  </div>
                </button>
              ))}
            </Marquee>
          </div>
        </div>
      ),
    },
    {
      Icon: Target,
      name: "弱点フォーカス",
      description: "これまでの添削で繰り返し指摘された、あなた固有の弱点上位です",
      className: "col-span-3 md:col-span-3 lg:col-span-1",
      href: "/review",
      cta: "弱点マップを見る",
      background: (
        <div className="relative w-full h-full flex flex-col justify-center">
          {/* Ambient Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-36 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex flex-col gap-1.5 relative z-10">
            {weaknessFocus.length > 0 ? (
              weaknessFocus.map((item, index) => {
                const rankStyles = [
                  "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
                  "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/30",
                  "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/30",
                ]
                return (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 rounded-xl bg-muted/40 border border-border/60 shadow-2xs"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "text-[10px] font-extrabold px-1.5 py-0.5 rounded-md border shrink-0",
                          rankStyles[index] || rankStyles[2]
                        )}
                      >
                        #{index + 1}
                      </span>
                      <span className="text-xs font-semibold text-foreground truncate max-w-28">
                        {item.label}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-foreground shrink-0">
                      <span className="text-primary">{item.count}</span>{" "}
                      <span className="text-[10px] font-normal text-muted-foreground">回</span>
                    </span>
                  </div>
                )
              })
            ) : (
              <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-muted/30 border border-dashed border-border text-center">
                <CheckCircle2 className="size-5 text-emerald-500 mb-1" />
                <p className="text-xs font-medium text-foreground">弱点データ蓄積中</p>
                <p className="text-[10px] text-muted-foreground">ドリル提出で自動分析</p>
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      Icon: Palette,
      name: "絵画ドリル",
      description: "美術史の物語を読み解きながら英語で気づきを書く進捗です",
      href: "/practice/painting",
      cta: "絵画ドリルへ",
      className: "col-span-3 md:col-span-3",
      background: (
        <div className="relative w-full flex items-center gap-4 py-1">
          {/* Ambient Glow */}
          <div className="absolute top-1/2 left-1/4 -translate-y-1/2 size-40 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex -space-x-3 relative z-10 shrink-0">
            {paintingProgress.paintings.slice(0, 6).map((p, index) => (
              <div
                key={p.slug}
                className={cn(
                  "relative size-11 rounded-full overflow-hidden border-2 border-card shadow-xs shrink-0",
                  !p.completed && "opacity-40 grayscale"
                )}
                style={{ zIndex: 6 - index }}
              >
                {/* Supabase Storageのホスト(環境で変わりうる)はnext.config.tsのremotePatternsに
                    登録していないため、next/imageではなく素の<img>で表示する
                    (painting-catalog-view.tsxと同じ方針) */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.imageUrl}
                  alt={p.title}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover"
                />
                {p.completed && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <CheckCircle2 className="size-4 text-white" />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex-1 min-w-0 relative z-10 space-y-1.5">
            <div className="flex items-baseline gap-1.5">
              <NumberTicker
                value={paintingProgress.completed}
                className="text-2xl font-black text-foreground"
              />
              <span className="text-sm text-muted-foreground font-medium">
                / {paintingProgress.total} 完了
              </span>
            </div>
            <Progress
              value={
                paintingProgress.total > 0
                  ? (paintingProgress.completed / paintingProgress.total) * 100
                  : 0
              }
            />
          </div>
        </div>
      ),
    },
  ]

  return (
    <>
      <div className="h-full w-full overflow-y-auto p-4 md:p-6 flex flex-col max-w-7xl mx-auto">
        <BentoGrid>
          {features.map((feature, idx) => (
            <BentoCard key={idx} {...feature} />
          ))}
        </BentoGrid>
      </div>

      {/* 1. ドリル履歴詳細モーダル */}
      <DrillDetailModal
        drill={selectedDrill}
        open={isDrillModalOpen}
        onOpenChange={setIsDrillModalOpen}
      />

      {/* 2. 直近のアクティビティ詳細モーダル */}
      <RecentActivityModal
        activity={recentActivity}
        open={isActivityModalOpen}
        onOpenChange={setIsActivityModalOpen}
        onSelectDrill={handleDrillClick}
      />

      {/* 3. 予測成功率推移・想起分析モーダル */}
      <GuessAccuracyModal
        stats={guessStats}
        open={isAccuracyModalOpen}
        onOpenChange={setIsAccuracyModalOpen}
      />
    </>
  )
}
