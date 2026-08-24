"use client"

import React, { useCallback, useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { AspectRatio } from "@/components/ui/aspect-ratio"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import type { GradingResult } from "@/lib/ai1"
import { GradingResultCard } from "@/components/practice/grading-result-card"
import { AiHint } from "@/components/practice/ai-hint"
import { GradingProgressHint } from "@/components/practice/grading-progress-hint"
import {
  AlertCircle,
  Sparkles,
  ArrowRight,
  Loader2,
  RefreshCw,
  Timer,
  Clock,
  ImageIcon,
} from "lucide-react"
import { useStopwatch } from "@/hooks/use-stopwatch"
import { cn } from "@/lib/utils"

interface NextImageData {
  imageUrl: string
  photographerName: string
  photographerUrl: string
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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="gap-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="size-5 text-primary" />
              <DialogTitle className="text-lg font-semibold">AI添削結果</DialogTitle>
            </div>
            {duration && (
              <Badge variant="outline" className="flex items-center gap-1.5 font-mono text-xs font-normal">
                <Clock className="size-3 text-muted-foreground" />
                <span>回答時間: {duration.formatted}</span>
              </Badge>
            )}
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            AIによる英文の添削と解説フィードバックです
          </DialogDescription>
        </DialogHeader>

        {errorText ? (
          <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-destructive">
            <AlertCircle className="size-5 shrink-0" />
            <p className="text-sm">{errorText}</p>
          </div>
        ) : result ? (
          <div className="py-2">
            <GradingResultCard result={result} />
          </div>
        ) : null}

        <DialogFooter className="gap-2 sm:gap-0 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            閉じる
          </Button>
          <Button
            onClick={() => {
              onOpenChange(false)
              nextStepHandler()
            }}
            className="gap-1.5"
          >
            <span>次の問題へ進む</span>
            <ArrowRight className="size-3.5" />
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
  const [sessionCount, setSessionCount] = useState(0)

  // ストップウォッチによる経過時間の管理
  const { elapsedTime, formattedTime, isRunning, stop, reset, restart } = useStopwatch()
  const [submittedDuration, setSubmittedDuration] = useState<{ seconds: number; formatted: string } | null>(null)

  const fetchNextImage = useCallback(async () => {
    reset()
    setIsImageLoading(true)
    setImageError(null)

    try {
      const res = await fetch("/practice/describe/next-image")

      if (!res.ok) {
        let errorMsg = `HTTP Error ${res.status}: ${res.statusText}`
        try {
          const errorData = await res.json()
          errorMsg = errorData.error || errorMsg
        } catch {
          const rawText = await res.text()
          console.error("[DEBUG] API error non-JSON response:", rawText.slice(0, 200))
        }
        throw new Error(errorMsg)
      }

      const data: NextImageData = await res.json()
      setImageData(data)
      setUserText("")
      setSessionCount((prev) => (prev === 0 ? 1 : prev + 1))
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

  const submitGrading = async () => {
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
      photographerName: imageData.photographerName,
      photographerUrl: imageData.photographerUrl,
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

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    submitGrading()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault()
      submitGrading()
    }
  }

  // 単語数・文字数の算出
  const wordCount = userText.trim() ? userText.trim().split(/\s+/).length : 0
  const charCount = userText.length

  return (
    <div className="h-full w-full overflow-hidden flex flex-col items-center justify-center p-3 sm:p-4 bg-background text-foreground">
      {/* メインカード（画面内に収まりスクロールさせない構造） */}
      <div className="w-full max-w-xl rounded-2xl border border-border/70 bg-card p-4 sm:p-5 shadow-xs flex flex-col gap-3.5">
        {/* カード上部：ステータス & 別の画像ボタン（画像表示時のみ） */}
        <div className="flex items-center justify-between min-h-7 px-0.5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">画像描写ドリル</span>
            {sessionCount > 0 && (
              <>
                <span>·</span>
                <span>本日 {sessionCount} 問目</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* ストップウォッチ */}
            <div
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-mono transition-colors",
                isRunning
                  ? "bg-primary/5 border-primary/20 text-primary"
                  : "bg-muted/50 border-border text-muted-foreground"
              )}
            >
              <Timer className={cn("size-3", isRunning ? "text-primary" : "text-muted-foreground")} />
              <span className="font-medium text-foreground">{formattedTime}</span>
            </div>

            {/* 別の画像を取得（スキップ） */}
            {imageData && (
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchNextImage}
                disabled={isImageLoading || isLoading}
                className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground hover:bg-muted"
                title="別の画像を取得します"
              >
                <RefreshCw className={cn("size-3", isImageLoading && "animate-spin")} />
                <span>別の画像</span>
              </Button>
            )}
          </div>
        </div>

        {/* 画像表示エリア */}
        <div className="relative w-full overflow-hidden rounded-xl border border-border/50 bg-muted/30">
          <AspectRatio ratio={16 / 9} className="relative w-full overflow-hidden">
            {isImageLoading ? (
              <div className="flex flex-col h-full w-full items-center justify-center gap-2.5 bg-muted/40 text-muted-foreground">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
                <span className="text-xs font-medium">画像を読み込んでいます...</span>
              </div>
            ) : imageData?.imageUrl ? (
              <Image
                src={imageData.imageUrl}
                alt="Description practice image"
                fill
                className="object-cover transition-opacity duration-300"
                sizes="(max-width: 768px) 100vw, 640px"
                priority
              />
            ) : (
              /* 初期状態（未取得時）またはエラー時のスタート画面 */
              <div className="flex flex-col h-full w-full items-center justify-center gap-2.5 p-6 text-center bg-muted/20">
                <div className="flex items-center justify-center size-10 rounded-xl bg-primary/10 text-primary">
                  <ImageIcon className="size-5" />
                </div>
                <div className="space-y-0.5 max-w-sm">
                  <h3 className="text-xs font-semibold text-foreground">
                    {imageError ? "画像の読み込みに失敗しました" : "画像描写トレーニング"}
                  </h3>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {imageError
                      ? imageError
                      : "写真の状況や様子を英語で描写してみましょう。"}
                  </p>
                </div>
                <Button
                  onClick={fetchNextImage}
                  disabled={isImageLoading}
                  size="sm"
                  className="mt-1 font-medium text-xs gap-1.5 shadow-xs h-8 px-3.5"
                >
                  <Sparkles className="size-3.5" />
                  <span>{imageError ? "画像を再取得" : "画像を取得して開始"}</span>
                </Button>
              </div>
            )}
          </AspectRatio>
        </div>

        {/* 画像クレジット＆ガイド */}
        <div className="flex items-center justify-between text-[11px] text-muted-foreground px-0.5 -mt-1">
          <span>写真の様子・人物・行動などを英語で描写</span>
          {imageData && (
            <span className="truncate max-w-55">
              Photo by{" "}
              <a
                href={`${imageData.photographerUrl}?utm_source=unstreak&utm_medium=referral`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground transition-colors"
              >
                {imageData.photographerName}
              </a>{" "}
              on Unsplash
            </span>
          )}
        </div>

        {/* 解答入力フォーム */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
          <div className="relative">
            <Textarea
              required
              rows={3}
              placeholder={
                imageData
                  ? "What is happening in the picture? (e.g. A barista is carefully preparing coffee...)"
                  : "上の「画像を取得して開始」ボタンを押すとドリルが始まります"
              }
              value={userText}
              onChange={(e) => setUserText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading || isImageLoading || !imageData}
              style={{ fieldSizing: "fixed" }}
              className="h-28 min-h-28 max-h-28 field-sizing-fixed w-full resize-none overflow-y-auto p-3 text-sm leading-relaxed rounded-xl border-border bg-background/50 focus:bg-background focus:ring-1 focus:ring-primary/30 transition-colors"
            />
          </div>

          <AiHint />

          {/* カウンター & アクションバー */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
              <span>{wordCount} 語</span>
              <span>·</span>
              <span>{charCount} 文字</span>
              <span className="hidden sm:inline-block text-[11px] font-sans text-muted-foreground/70 ml-1">
                ( ⌘ / Ctrl + Enter で送信 )
              </span>
            </div>

            <Button
              type="submit"
              disabled={isLoading || isImageLoading || !userText.trim() || !imageData?.imageUrl}
              className="min-w-32 font-medium h-8 text-xs gap-1.5 shadow-xs"
            >
              {isLoading ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>AIが添削中...</span>
                </>
              ) : (
                <>
                  <Sparkles className="size-3.5" />
                  <span>添削してもらう</span>
                </>
              )}
            </Button>
          </div>

          <GradingProgressHint loading={isLoading} />
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
