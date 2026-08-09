"use client"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import Image from "next/image"
import { AspectRatio } from "@/components/ui/aspect-ratio"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Bubble, BubbleContent } from "@/components/ui/bubble"
import { Message, MessageAvatar, MessageContent } from "@/components/ui/message"
import { Badge } from "@/components/ui/badge"
import React, { useCallback, useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import type { GradingResult, GradingError } from "@/lib/ai1"
import {
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Loader2,
  BookCheck,
  Check,
  Copy,
  RefreshCw,
  Timer,
  Clock,
} from "lucide-react"
import { ShinyButton } from "@/components/ui/shiny-button"
import { useStopwatch } from "@/hooks/use-stopwatch"

interface NextImageData {
  imageUrl: string
  photographerName: string
  photographerUrl: string
}

const categoryLabels: Record<
  GradingError["category"],
  { label: string; className: string }
> = {
  grammar: {
    label: "文法",
    className: "bg-blue-100 text-blue-800 border-blue-200",
  },
  vocabulary: {
    label: "語彙",
    className: "bg-purple-100 text-purple-800 border-purple-200",
  },
  unnatural_phrasing: {
    label: "不自然な表現",
    className: "bg-amber-100 text-amber-800 border-amber-200",
  },
  spelling: {
    label: "スペル",
    className: "bg-rose-100 text-rose-800 border-rose-200",
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

interface ResultModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  result: GradingResult | null
  errorText: string | null
  nextStepHandler: () => void
  duration?: { seconds: number; formatted: string } | null
}

function ResultModal({
  open,
  onOpenChange,
  result,
  errorText,
  nextStepHandler,
  duration,
}: ResultModalProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="size-5 text-primary" />
              <DialogTitle className="text-xl">AI添削結果</DialogTitle>
            </div>
            {duration && (
              <Badge variant="outline" className="flex items-center gap-1 font-mono text-xs font-normal">
                <Clock className="size-3 text-muted-foreground" />
                <span>回答時間: {duration.formatted}</span>
              </Badge>
            )}
          </div>
          <DialogDescription>
            AIによる英文の添削と解説フィードバックです
          </DialogDescription>
        </DialogHeader>

        {errorText ? (
          <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive">
            <AlertCircle className="size-5 shrink-0" />
            <p className="text-sm">{errorText}</p>
          </div>
        ) : result ? (
          <div className="space-y-6 py-2">
            {/* 総評コメント */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary mb-1">
                <BookCheck className="size-4" />
                <span>総評</span>
              </div>
              <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                {result.overall_comment}
              </p>
            </div>

            {/* 修正済みフルテキスト */}
            <div className="rounded-xl border border-border bg-muted/40 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  修正後の英文
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => handleCopy(result.corrected_text)}
                >
                  {copied ? (
                    <>
                      <Check className="mr-1 size-3.5 text-green-600" />
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
              <p className="text-sm font-medium leading-relaxed text-foreground bg-background rounded-lg p-3 border border-border">
                {result.corrected_text}
              </p>
            </div>

            {/* 指摘・添削一覧 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">
                  指摘・改善ポイント ({result.errors.length}件)
                </h3>
              </div>

              {result.errors.length === 0 ? (
                <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-green-800">
                  <CheckCircle2 className="size-5 shrink-0 text-green-600" />
                  <div>
                    <p className="text-sm font-semibold">素晴らしい！</p>
                    <p className="text-xs text-green-700">
                      文法や語彙のエラーは見つかりませんでした。とても自然な英文です。
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {result.errors.map((err, idx) => {
                    const cat = categoryLabels[err.category]
                    const grammarLabel =
                      err.grammar_point && grammarPointLabels[err.grammar_point]
                        ? grammarPointLabels[err.grammar_point]
                        : err.grammar_point

                    return (
                      <div
                        key={idx}
                        className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-xs"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${cat?.className}`}
                          >
                            {cat?.label ?? err.category}
                          </span>
                          {grammarLabel && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-secondary text-secondary-foreground">
                              {grammarLabel}
                            </span>
                          )}
                          {err.vocab_lemma && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-muted text-muted-foreground">
                              単語: {err.vocab_lemma}
                            </span>
                          )}
                        </div>

                        {/* フレーズ比較 */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm bg-muted/30 rounded-lg p-2.5">
                          <span className="line-through text-red-600 bg-red-50 px-2 py-1 rounded border border-red-100 break-all">
                            {err.user_fragment}
                          </span>
                          <ArrowRight className="size-4 text-muted-foreground shrink-0 hidden sm:block" />
                          <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-100 break-all">
                            {err.corrected_fragment}
                          </span>
                        </div>

                        {/* 解説 */}
                        <p className="text-xs text-muted-foreground leading-relaxed pl-1">
                          {err.explanation_ja}
                        </p>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        ) : null}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            閉じる
          </Button>
          <Button onClick={() => {onOpenChange(false); nextStepHandler()}}>
            次へ進む
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function DescribePage() {
  const [imageData, setImageData] = useState<NextImageData | null>(null)
  const [isImageLoading, setIsImageLoading] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)

  const [userText, setUserText] = useState("")
  const [gradingResult, setGradingResult] = useState<GradingResult | null>(null)
  const [errorText, setErrorText] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  // ストップウォッチによる経過時間の管理
  const { elapsedTime, formattedTime, isRunning, stop, reset, restart } = useStopwatch()
  const [submittedDuration, setSubmittedDuration] = useState<{ seconds: number; formatted: string } | null>(null)

  const fetchNextImage = useCallback(async () => {
    reset()
    setIsImageLoading(true)
    setImageError(null)
    console.log("[DEBUG] fetchNextImage started: requesting /practice/describe/next-image")

    try {
      const res = await fetch("/practice/describe/next-image")
      console.log("[DEBUG] fetchNextImage response status:", res.status, res.statusText)

      if (!res.ok) {
        let errorMsg = `HTTP Error ${res.status}: ${res.statusText}`
        try {
          const errorData = await res.json()
          console.error("[DEBUG] API error response JSON:", errorData)
          errorMsg = errorData.error || errorMsg
        } catch {
          const rawText = await res.text()
          console.error("[DEBUG] API error non-JSON response (e.g. HTML 404/500):", rawText.slice(0, 200))
        }
        throw new Error(errorMsg)
      }

      const data: NextImageData = await res.json()
      console.log("[DEBUG] fetchNextImage success:", data)
      setImageData(data)
      setUserText("")
      // 画像取得完了と同時にタイマースタート
      restart()
    } catch (err: any) {
      console.error("[DEBUG] Failed to fetch next image:", err)
      setImageError(err.message || "画像を取得できませんでした")
      reset()
    } finally {
      setIsImageLoading(false)
    }
  }, [restart, reset])

  const handleNextStep = () => {
    setIsModalOpen(false)
    fetchNextImage()
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!imageData?.imageUrl || !userText.trim() || isLoading) return

    // 送信時にタイマーを停止し、回答にかかった時間を記録
    stop()
    const currentDuration = { seconds: elapsedTime, formatted: formattedTime }
    setSubmittedDuration(currentDuration)

    setIsLoading(true)
    setErrorText(null)

    const postData = {
      imageUrl: imageData.imageUrl,
      userText,
    }

    try {
      const response = await fetch("/api/grade", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(postData),
      })

      if (!response.ok) {
        throw new Error("採点APIでエラーが発生しました")
      }
      const result: GradingResult = await response.json()
      setGradingResult(result)
      setIsModalOpen(true)
    } catch (error) {
      console.error("ERROR:", error)
      setErrorText("採点中にエラーが発生しました。もう一度お試しください。")
      setGradingResult(null)
      setIsModalOpen(true)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col min-h-full w-full bg-gray-100 p-6 flex-1 items-center justify-center gap-8">
      <ShinyButton
        onClick={fetchNextImage}
        disabled={isImageLoading || isLoading}
        className="w-1/2 max-w-sm"
      >
        {isImageLoading ? (
          <span className="flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" />
            取得中...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <RefreshCw className="size-4" />
            別の画像を取得(1クレジットを消費します)
          </span>
        )}
      </ShinyButton>

      {/* ステータスバー（枚数 ＆ 経過時間タイマー） */}
      <div className="flex items-center justify-between w-full max-w-xl px-1">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Sparkles className="size-3.5 text-primary" />
          <span>本日 <span className="font-semibold text-foreground">1</span> 枚目</span>
        </div>

        <div
          className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium transition-colors shadow-2xs ${
            isRunning
              ? "bg-white border-primary/30 text-primary"
              : "bg-white/80 border-border text-muted-foreground"
          }`}
        >
          <Timer className={`size-3.5 ${isRunning ? "animate-pulse text-primary" : "text-muted-foreground"}`} />
          <span className="text-muted-foreground">経過時間:</span>
          <span className="font-mono font-semibold text-foreground text-sm">{formattedTime}</span>
          <span className="text-[11px] text-muted-foreground">({elapsedTime}秒)</span>
        </div>
      </div>

      {/* 画像と回答入力フォームセクション */}
      <div className="flex flex-col gap-6 bg-white p-8 rounded-2xl shadow-xs w-full max-w-xl">
        <AspectRatio ratio={16 / 9} className="rounded-lg bg-muted overflow-hidden relative">
          {isImageLoading ? (
            <div className="flex h-full w-full items-center justify-center bg-gray-100 text-muted-foreground">
              <Loader2 className="size-8 animate-spin" />
            </div>
          ) : imageData?.imageUrl ? (
            <Image
              src={imageData.imageUrl}
              alt="Description practice image"
              fill
              className="rounded-lg object-cover"
              priority
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gray-100 text-sm text-destructive">
              {imageError || "画像がありません"}
            </div>
          )}
        </AspectRatio>

        <div className="flex justify-between text-xs text-muted-foreground font-medium">
          <span>画像描写トレーニング</span>
          {imageData && (
            <span>
              Photo by{" "}
              <a
                href={`${imageData.photographerUrl}?utm_source=unstreak&utm_medium=referral`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground"
              >
                {imageData.photographerName}
              </a>{" "}
              on Unsplash
            </span>
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Textarea
            required
            rows={6}
            placeholder="画像を見て、英語で説明してみましょう（例: A cute rabbit is sitting on the grass...）"
            value={userText}
            onChange={(e) => setUserText(e.target.value)}
            disabled={isLoading}
            className="resize-none"
          />
          <Button type="submit" disabled={isLoading || !userText.trim()} className="w-full">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                AIが採点中...
              </>
            ) : (
              "添削してもらう"
            )}
          </Button>
        </form>
      </div>
    
      {/* 結果表示モーダル */}
      <ResultModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        result={gradingResult}
        errorText={errorText}
        nextStepHandler={handleNextStep}
        duration={submittedDuration}
      />
    </div>
  )
}

