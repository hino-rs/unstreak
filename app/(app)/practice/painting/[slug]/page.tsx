"use client"

import { useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
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
import { getPaintingBySlug } from "@/lib/mock-paintings"
import { markSlugCompleted } from "@/lib/mock-painting-progress"

type Step = "round1" | "reveal" | "round2" | "done"

const STEPS: { key: Step; label: string }[] = [
  { key: "round1", label: "気づきを書く" },
  { key: "reveal", label: "解説を読む" },
  { key: "round2", label: "もう一度書く" },
]

type MockGrade = {
  comment: string
  errors: { label: string; from: string; to: string }[]
}

// AI1添削のモック。実装時は既存の lib/ai1.ts (gradeDescription) を流用する想定
function mockGradeRound1(text: string): MockGrade {
  if (text.trim().split(/\s+/).length < 8) {
    return {
      comment: "内容は伝わりますが、もう少し詳しく描写してみましょう。冠詞の抜けも見られます。",
      errors: [{ label: "冠詞", from: "man standing", to: "a man standing" }],
    }
  }
  return {
    comment: "情景がよく伝わる描写です。冠詞と時制に注意すると、さらに自然になります。",
    errors: [{ label: "冠詞", from: "in front of horse", to: "in front of a horse" }],
  }
}

function mockGradeRound2(): MockGrade {
  return {
    comment: "解説を踏まえた語彙（symbolism, allegory など）を使えていて、表現の幅が広がっています。",
    errors: [],
  }
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

function MiniGradeCard({ grade }: { grade: MockGrade }) {
  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 space-y-2.5">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
        <Sparkles className="size-3.5" />
        <span>AI1 添削（モック）</span>
      </div>
      <p className="text-xs text-foreground leading-relaxed">{grade.comment}</p>
      {grade.errors.length > 0 && (
        <div className="space-y-1.5">
          {grade.errors.map((e, i) => (
            <div
              key={i}
              className="flex flex-wrap items-center gap-2 text-[11px] bg-background/70 rounded-lg p-2 border border-border/60"
            >
              <Badge variant="outline" className="text-[10px] font-normal shrink-0">
                {e.label}
              </Badge>
              <span className="line-through text-rose-600 dark:text-rose-400">{e.from}</span>
              <ArrowRight className="size-3 text-muted-foreground shrink-0" />
              <span className="font-medium text-emerald-700 dark:text-emerald-400">{e.to}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function PaintingSessionPage() {
  const params = useParams<{ slug: string }>()
  const router = useRouter()
  const painting = useMemo(() => getPaintingBySlug(params.slug), [params.slug])

  const [step, setStep] = useState<Step>("round1")
  const [text1, setText1] = useState("")
  const [text2, setText2] = useState("")
  const [grade1, setGrade1] = useState<MockGrade | null>(null)
  const [grade2, setGrade2] = useState<MockGrade | null>(null)
  const [grading, setGrading] = useState(false)
  const [tourIdx, setTourIdx] = useState(0)

  const { noticed, missed } = useMemo(() => {
    if (!painting) return { noticed: [], missed: [] }
    const lower = text1.toLowerCase()
    const noticedEls = painting.noticeableElements.filter((el) =>
      el.keywords.some((kw) => lower.includes(kw))
    )
    const missedEls = painting.noticeableElements.filter(
      (el) => !el.keywords.some((kw) => lower.includes(kw))
    )
    return { noticed: noticedEls, missed: missedEls }
  }, [text1, painting])

  if (!painting) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-3">
        <p className="text-sm text-muted-foreground">絵画が見つかりませんでした。</p>
        <Link href="/practice/painting" className="text-sm text-primary underline">
          一覧に戻る
        </Link>
      </div>
    )
  }

  const submitRound1 = () => {
    if (!text1.trim()) return
    setGrading(true)
    setTimeout(() => {
      setGrade1(mockGradeRound1(text1))
      setGrading(false)
    }, 650)
  }

  const submitRound2 = () => {
    if (!text2.trim()) return
    setGrading(true)
    setTimeout(() => {
      setGrade2(mockGradeRound2())
      setGrading(false)
    }, 650)
  }

  const finishSession = () => {
    markSlugCompleted(painting.slug)
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

          {grade1 ? (
            <>
              <MiniGradeCard grade={grade1} />
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

      {step === "reveal" && (() => {
        const pages = painting.tourPages
        const page = pages[tourIdx]
        const isFirst = tourIdx === 0
        const isLast = tourIdx === pages.length - 1

        return (
          <div className="space-y-4">
            {(noticed.length > 0 || missed.length > 0) && (
              <div className="rounded-xl border border-border/60 bg-muted/30 p-3 space-y-1 text-[11px] leading-relaxed">
                {noticed.length > 0 && (
                  <p className="text-foreground">
                    あなたが気づいた <span className="font-semibold">{noticed.map((n) => n.label).join("、")}</span>{" "}
                    は、実際に美術史家も注目するポイントです。
                  </p>
                )}
                {missed.length > 0 && (
                  <p className="text-muted-foreground">
                    一方で <span className="font-semibold text-foreground">{missed.map((n) => n.label).join("、")}</span>{" "}
                    は見落としがちなポイントです。
                  </p>
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
                      AI3 キュレーター解説（モック） · {tourIdx + 1}/{pages.length}
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

          {grade2 ? (
            <>
              <MiniGradeCard grade={grade2} />
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
              「{painting.title}」の鑑賞ドリルを完了しました。気づき→解説→再反応の2ラウンドで、産出した英語が弱点プールに記録されます（モックのためダミー動作）。
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
