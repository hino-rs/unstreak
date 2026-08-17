"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Loader2,
  Palette,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { AspectRatio } from "@/components/ui/aspect-ratio"
import { cn } from "@/lib/utils"
import type { GradingResult } from "@/lib/ai1"
import { GradingResultCard } from "@/components/practice/grading-result-card"
import type { PaintingSummary } from "@/lib/paintings"

type Step = "round1" | "reveal" | "round2" | "done"

const STEPS: { key: Step; label: string }[] = [
  { key: "round1", label: "気づきを書く" },
  { key: "reveal", label: "解説を読む" },
  { key: "round2", label: "もう一度書く" },
]

type RevealTourPage = {
  heading: string
  body: string
  focusX: number
  focusY: number
  zoom: number
}

type RevealData = {
  noticedLabels: string[]
  missedLabels: string[]
  noticedText: string | null
  missedText: string | null
  tourPages: RevealTourPage[]
}

function StepIndicator({ current }: { current: Step }) {
  const idx = STEPS.findIndex((s) => s.key === current)
  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      {STEPS.map((s, i) => (
        <div key={s.key} className="flex items-center gap-1.5 sm:gap-2">
          <div className="flex items-center gap-1.5">
            <div
              className={cn(
                "size-6 rounded-full flex items-center justify-center text-[11px] font-bold border shrink-0",
                i < idx
                  ? "bg-primary text-primary-foreground border-primary"
                  : i === idx
                  ? "border-primary text-primary bg-primary/10"
                  : "border-border text-muted-foreground bg-muted"
              )}
            >
              {i < idx ? <Check className="size-3.5" /> : i + 1}
            </div>
            <span
              className={cn(
                "text-xs font-medium hidden sm:inline",
                i === idx ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {s.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={cn("h-px w-5 sm:w-8", i < idx ? "bg-primary" : "bg-border")} />
          )}
        </div>
      ))}
    </div>
  )
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-destructive">
      <AlertCircle className="size-4 shrink-0" />
      <p className="text-xs">{message}</p>
    </div>
  )
}

export function PaintingSessionView({ painting }: { painting: PaintingSummary }) {
  const router = useRouter()

  const [step, setStep] = useState<Step>("round1")
  const [text1, setText1] = useState("")
  const [text2, setText2] = useState("")
  const [grade1, setGrade1] = useState<GradingResult | null>(null)
  const [grade2, setGrade2] = useState<GradingResult | null>(null)
  const [attemptId, setAttemptId] = useState<string | null>(null)
  const [reveal, setReveal] = useState<RevealData | null>(null)
  const [grading, setGrading] = useState(false)
  const [errorText, setErrorText] = useState<string | null>(null)
  const [tourIdx, setTourIdx] = useState(0)

  const submitRound1 = async () => {
    if (!text1.trim() || grading) return
    setGrading(true)
    setErrorText(null)
    try {
      const res = await fetch(`/api/painting/${painting.slug}/round1`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text1 }),
      })
      if (!res.ok) {
        if (res.status === 402) {
          setErrorText("クレジットが不足しています。設定画面から追加してください。")
        } else if (res.status === 429) {
          setErrorText("しばらく時間をおいてから再度お試しください。")
        } else {
          setErrorText("添削中にエラーが発生しました。もう一度お試しください。")
        }
        return
      }
      const data: { attemptId: string; round1: GradingResult; reveal: RevealData } = await res.json()
      setAttemptId(data.attemptId)
      setGrade1(data.round1)
      setReveal(data.reveal)
    } catch {
      setErrorText("通信エラーが発生しました。もう一度お試しください。")
    } finally {
      setGrading(false)
    }
  }

  const submitRound2 = async () => {
    if (!text2.trim() || grading || !attemptId) return
    setGrading(true)
    setErrorText(null)
    try {
      const res = await fetch(`/api/painting/${painting.slug}/round2`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId, text: text2 }),
      })
      if (!res.ok) {
        if (res.status === 429) {
          setErrorText("しばらく時間をおいてから再度お試しください。")
        } else {
          setErrorText("添削中にエラーが発生しました。もう一度お試しください。")
        }
        return
      }
      const data: { round2: GradingResult } = await res.json()
      setGrade2(data.round2)
    } catch {
      setErrorText("通信エラーが発生しました。もう一度お試しください。")
    } finally {
      setGrading(false)
    }
  }

  const finishSession = () => {
    setStep("done")
  }

  return (
    <div
      className={cn(
        "p-4 sm:p-6 md:p-8 mx-auto w-full space-y-5 transition-[max-width] duration-300",
        step === "reveal" ? "max-w-4xl" : "max-w-2xl"
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/practice/painting"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          一覧へ戻る
        </Link>
        {step !== "done" && <StepIndicator current={step} />}
      </div>

      {step === "round1" && (
        <div className="space-y-4">
          <div className="relative w-full overflow-hidden rounded-2xl border border-border/60 bg-muted">
            <AspectRatio ratio={4 / 3}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={painting.imageUrl}
                alt="鑑賞対象の絵画（タイトル・作者は非表示）"
                className="h-full w-full object-cover"
              />
            </AspectRatio>
            <div className="absolute top-3 left-3">
              <Badge variant="secondary" className="text-[11px] font-normal">
                タイトル・作者は非表示
              </Badge>
            </div>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            先入観なしで、まず何が見えるか・何を感じるかを英語で書いてみましょう。
          </p>

          <Textarea
            rows={4}
            value={text1}
            onChange={(e) => setText1(e.target.value)}
            disabled={!!grade1}
            placeholder="What do you notice in this painting? What might be happening?"
            className="text-sm leading-relaxed"
          />

          {errorText && !grade1 && <ErrorBanner message={errorText} />}

          {grade1 ? (
            <>
              <GradingResultCard result={grade1} />
              <Button
                onClick={() => {
                  setTourIdx(0)
                  setStep("reveal")
                }}
                className="w-full gap-1.5"
              >
                <span>解説を見る</span>
                <ArrowRight className="size-3.5" />
              </Button>
            </>
          ) : (
            <Button
              onClick={submitRound1}
              disabled={!text1.trim() || grading}
              className="w-full gap-1.5"
            >
              {grading ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>AI1が添削中...</span>
                </>
              ) : (
                <>
                  <Sparkles className="size-3.5" />
                  <span>提出する</span>
                </>
              )}
            </Button>
          )}
        </div>
      )}

      {step === "reveal" && reveal && (() => {
        const pages = reveal.tourPages
        const page = pages[tourIdx]
        const isFirst = tourIdx === 0
        const isLast = tourIdx === pages.length - 1

        return (
          <div className="space-y-4">
            {(reveal.noticedText || reveal.missedText) && (
              <div className="rounded-xl border border-border/60 bg-muted/30 p-3 space-y-1 text-[11px] leading-relaxed">
                {reveal.noticedText && <p className="text-foreground">{reveal.noticedText}</p>}
                {reveal.missedText && (
                  <p className="text-muted-foreground">{reveal.missedText}</p>
                )}
              </div>
            )}

            <div className="flex flex-col md:flex-row gap-4 md:gap-5 items-stretch">
              {/* 左：画像（フォーカスポイントにズーム） */}
              <div className="md:w-[38%] shrink-0 space-y-3">
                <div className="relative w-full overflow-hidden rounded-2xl border border-border/60 bg-black/90">
                  <AspectRatio ratio={4 / 3}>
                    <div
                      className="absolute inset-0 transition-[background-position,background-size] duration-700 ease-out"
                      style={{
                        backgroundImage: `url(${painting.imageUrl})`,
                        backgroundSize: `${page.zoom}%`,
                        backgroundPosition: `${page.focusX}% ${page.focusY}%`,
                        backgroundRepeat: "no-repeat",
                      }}
                    />
                  </AspectRatio>
                </div>

                <div>
                  <h2 className="text-sm font-bold text-foreground">{painting.title}</h2>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {painting.artist} · {painting.year}
                  </p>
                </div>

                {/* ページドット */}
                <div className="flex items-center gap-1.5">
                  {pages.map((_, i) => (
                    <span
                      key={i}
                      className={cn(
                        "h-1.5 rounded-full transition-all",
                        i === tourIdx ? "w-5 bg-primary" : "w-1.5 bg-border"
                      )}
                    />
                  ))}
                </div>
              </div>

              {/* 右：解説（大きめ表示） */}
              <div className="flex-1 min-w-0 flex flex-col justify-between rounded-2xl border border-violet-200/70 bg-violet-50/50 dark:bg-violet-950/20 dark:border-violet-800/40 p-5 md:p-7 gap-5">
                <div className="space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-violet-700 dark:text-violet-300">
                    <Palette className="size-4" />
                    <span>
                      AI3 キュレーター解説 · {tourIdx + 1}/{pages.length}
                    </span>
                  </div>
                  <h3 className="text-lg md:text-xl font-bold text-foreground leading-snug">
                    {page.heading}
                  </h3>
                  <p className="text-sm md:text-base leading-relaxed text-foreground">{page.body}</p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-violet-200/60 dark:border-violet-800/40">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTourIdx((i) => Math.max(i - 1, 0))}
                    disabled={isFirst}
                    className="gap-1"
                  >
                    <ArrowLeft className="size-3.5" />
                    <span>戻る</span>
                  </Button>

                  {isLast ? (
                    <Button size="sm" onClick={() => setStep("round2")} className="gap-1.5">
                      <span>反応を書く</span>
                      <ArrowRight className="size-3.5" />
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => setTourIdx((i) => Math.min(i + 1, pages.length - 1))}
                      className="gap-1.5"
                    >
                      <span>次へ</span>
                      <ArrowRight className="size-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {step === "round2" && (
        <div className="space-y-4">
          <div className="relative w-full overflow-hidden rounded-2xl border border-border/60 bg-muted">
            <AspectRatio ratio={4 / 3}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={painting.imageUrl} alt={painting.title} className="h-full w-full object-cover" />
            </AspectRatio>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            解説を読んで、印象は変わりましたか？新しく知った単語も使って、英語でもう一度書いてみましょう（このステップはスキップできません）。
          </p>

          <Textarea
            rows={4}
            value={text2}
            onChange={(e) => setText2(e.target.value)}
            disabled={!!grade2}
            placeholder="Now that you know the background, how has your impression changed?"
            className="text-sm leading-relaxed"
          />

          {errorText && !grade2 && <ErrorBanner message={errorText} />}

          {grade2 ? (
            <>
              <GradingResultCard result={grade2} />
              <Button onClick={finishSession} className="w-full gap-1.5">
                <CheckCircle2 className="size-3.5" />
                <span>セッションを完了する</span>
              </Button>
            </>
          ) : (
            <Button
              onClick={submitRound2}
              disabled={!text2.trim() || grading}
              className="w-full gap-1.5"
            >
              {grading ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>AI1が添削中...</span>
                </>
              ) : (
                <>
                  <Sparkles className="size-3.5" />
                  <span>提出する</span>
                </>
              )}
            </Button>
          )}
        </div>
      )}

      {step === "done" && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 dark:bg-emerald-950/20 dark:border-emerald-800/50 p-8 flex flex-col items-center text-center gap-3">
          <div className="size-12 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="size-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">セッション完了！</h2>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              「{painting.title}」の鑑賞ドリルを完了しました。気づき→解説→再反応の2ラウンドで、産出した英語が弱点プールに記録されました。
            </p>
          </div>
          <Button onClick={() => router.push("/practice/painting")} className="gap-1.5 mt-1">
            <ArrowLeft className="size-3.5" />
            <span>一覧へ戻る</span>
          </Button>
        </div>
      )}
    </div>
  )
}
