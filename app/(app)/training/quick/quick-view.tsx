"use client"

import { useCallback, useState } from "react"
import Link from "next/link"
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ArrowRight,
  RefreshCw,
  PartyPopper,
} from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { cn } from "@/lib/utils"
import type { QuickQueueQuestion } from "@/lib/training/quick-queue"

type Status = "loading" | "ready" | "empty" | "error"
type Phase = "answering" | "feedback" | "summary"

type Feedback = {
  correct: boolean
  expected: string
  explanation: string | null
}

export function QuickView({ initialItems }: { initialItems: QuickQueueQuestion[] }) {
  const [status, setStatus] = useState<Status>(initialItems.length > 0 ? "ready" : "empty")
  const [items, setItems] = useState<QuickQueueQuestion[]>(initialItems)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answer, setAnswer] = useState("")
  const [phase, setPhase] = useState<Phase>("answering")
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [results, setResults] = useState<boolean[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  // リトライ/「もう一度」ボタンから呼ばれる。マウント時の自動取得はサーバー側(page.tsx)で完結させているため
  // ここではイベントハンドラからの明示的な再取得のみを行う。
  const fetchQueue = useCallback(async () => {
    setStatus("loading")
    setCurrentIndex(0)
    setAnswer("")
    setPhase("answering")
    setFeedback(null)
    setResults([])

    try {
      const res = await fetch("/api/training/quick/queue")
      if (!res.ok) throw new Error(`HTTP Error ${res.status}`)
      const data: { items: QuickQueueQuestion[] } = await res.json()
      setItems(data.items)
      setStatus(data.items.length > 0 ? "ready" : "empty")
    } catch (err) {
      console.error("[training/quick] キューの取得に失敗:", err)
      setStatus("error")
    }
  }, [])

  const currentItem = items[currentIndex]

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!currentItem || !answer.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      const res = await fetch("/api/training/quick/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ materialRef: currentItem.materialRef, answer }),
      })
      if (!res.ok) throw new Error(`HTTP Error ${res.status}`)
      const result: Feedback = await res.json()
      setFeedback(result)
      setResults((prev) => [...prev, result.correct])
      setPhase("feedback")
    } catch (err) {
      console.error("[training/quick] 採点に失敗:", err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleNext = () => {
    const nextIndex = currentIndex + 1
    setAnswer("")
    setFeedback(null)
    if (nextIndex >= items.length) {
      setPhase("summary")
    } else {
      setCurrentIndex(nextIndex)
      setPhase("answering")
    }
  }

  const correctCount = results.filter(Boolean).length

  if (status === "loading") {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center gap-3 p-6">
        <Loader2 className="size-6 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">弱点を確認しています...</p>
      </div>
    )
  }

  if (status === "error") {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center gap-4 p-6 text-center">
        <Alert variant="destructive" className="max-w-sm">
          <AlertCircle className="size-4" />
          <AlertTitle>読み込みに失敗しました</AlertTitle>
          <AlertDescription>しばらくしてからもう一度お試しください。</AlertDescription>
        </Alert>
        <Button variant="outline" size="sm" onClick={fetchQueue}>
          <RefreshCw className="size-3.5" />
          もう一度試す
        </Button>
      </div>
    )
  }

  if (status === "empty") {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center gap-3 p-6 text-center">
        <CheckCircle2 className="size-8 text-emerald-500" />
        <h2 className="text-lg font-semibold">対処待ちの弱点が見つかりませんでした</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          画像説明ドリルやAI2辞書相棒への質問を通じて、弱点データが蓄積されると出題できるようになります。
        </p>
        <Link href="/training" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-1")}>
          特訓トップへ戻る
        </Link>
      </div>
    )
  }

  if (phase === "summary") {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center gap-4 p-6 text-center">
        <PartyPopper className="size-8 text-amber-500" />
        <h2 className="text-2xl font-bold tracking-tight">
          {correctCount} / {items.length} 問正解
        </h2>
        <p className="text-sm text-muted-foreground">お疲れさまでした。また次の弱点に挑戦しましょう。</p>
        <div className="flex items-center gap-2 mt-2">
          <Button variant="outline" size="sm" onClick={fetchQueue}>
            <RefreshCw className="size-3.5" />
            もう一度
          </Button>
          <Link href="/training" className={cn(buttonVariants({ size: "sm" }))}>
            特訓トップへ戻る
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>
    )
  }

  if (!currentItem) return null

  return (
    <div className="h-full w-full flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-lg rounded-2xl border border-border/70 bg-card p-5 sm:p-6 shadow-xs flex flex-col gap-5">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>問題 {currentIndex + 1} / {items.length}</span>
            {currentItem.displayLabel && <span className="font-medium text-foreground">{currentItem.displayLabel}</span>}
          </div>
          <Progress value={(currentIndex / items.length) * 100} />
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="space-y-2.5">
            <div className="rounded-xl bg-muted/40 border border-border/60 p-3.5 text-sm">
              {currentItem.cueText}
            </div>
            <Input
              autoFocus
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              disabled={phase !== "answering" || isSubmitting}
              placeholder="英語で入力"
            />
          </div>

          {phase === "answering" && (
            <Button type="submit" disabled={!answer.trim() || isSubmitting} className="self-end">
              {isSubmitting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  採点中...
                </>
              ) : (
                <>
                  こたえる
                  <ArrowRight className="size-3.5" />
                </>
              )}
            </Button>
          )}
        </form>

        {phase === "feedback" && feedback && (
          <div className="space-y-3">
            <Alert
              variant={feedback.correct ? "default" : "destructive"}
              className={cn(
                feedback.correct &&
                  "border-emerald-200 bg-emerald-50/70 text-emerald-900 dark:border-emerald-800/60 dark:bg-emerald-950/30 dark:text-emerald-300"
              )}
            >
              {feedback.correct ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />}
              <AlertTitle>{feedback.correct ? "正解！" : "不正解"}</AlertTitle>
              <AlertDescription
                className={cn(feedback.correct && "text-emerald-700 dark:text-emerald-400/90")}
              >
                正解: <span className="font-semibold">{feedback.expected}</span>
                {feedback.explanation && <p className="mt-1">{feedback.explanation}</p>}
              </AlertDescription>
            </Alert>

            <Button onClick={handleNext} className="w-full">
              {currentIndex + 1 >= items.length ? "結果を見る" : "次の問題へ"}
              <ArrowRight className="size-3.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
