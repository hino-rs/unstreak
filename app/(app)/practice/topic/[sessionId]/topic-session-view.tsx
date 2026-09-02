"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2, SendHorizontal, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import type { TopicSessionGrading } from "@/lib/ai1"
import { MAX_TOPIC_MESSAGE_LENGTH, MAX_TOPIC_USER_TURNS, type TopicTurnRow } from "@/lib/topic"
import { TopicSessionResultCard } from "@/components/practice/topic-session-result-card"

type SessionStatus = "active" | "awaiting_end" | "completed"

export function TopicSessionView({
  sessionId,
  initialTurns,
  initialStatus,
  initialGrading,
}: {
  sessionId: string
  initialTurns: TopicTurnRow[]
  initialStatus: SessionStatus
  initialGrading: TopicSessionGrading | null
}) {
  const router = useRouter()
  const [turns, setTurns] = useState<TopicTurnRow[]>(initialTurns)
  const [status, setStatus] = useState<SessionStatus>(initialStatus)
  const [grading, setGrading] = useState<TopicSessionGrading | null>(initialGrading)
  const [text, setText] = useState("")
  const [sending, setSending] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [errorText, setErrorText] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const localIdCounterRef = useRef(0)

  const userTurnCount = turns.filter((t) => t.role === "user").length
  const remainingTurns = Math.max(MAX_TOPIC_USER_TURNS - userTurnCount, 0)
  const capReached = status === "awaiting_end" || remainingTurns === 0
  const done = status === "completed" && grading !== null

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [turns, done])

  const submitTurn = async () => {
    const trimmed = text.trim()
    if (!trimmed || sending) return

    setSending(true)
    setErrorText(null)
    try {
      const res = await fetch(`/api/topic/sessions/${sessionId}/turns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      })
      if (!res.ok) {
        if (res.status === 429) {
          setErrorText("しばらく時間をおいてから再度お試しください。")
        } else if (res.status === 409) {
          setErrorText("この会話はもう終了しています。")
          setStatus("awaiting_end")
        } else {
          setErrorText("送信に失敗しました。もう一度お試しください。")
        }
        return
      }

      const data:
        | { turnCapReached: true }
        | {
            turnCapReached: false
            userTurnIndex: number
            turn: { id: string; content: string }
            capReachedNow: boolean
          } = await res.json()

      if (data.turnCapReached) {
        setStatus("awaiting_end")
        setErrorText("会話のターン数の上限に達しました。「終了して添削してもらう」から締めくくりましょう。")
        return
      }

      localIdCounterRef.current += 1
      const userTurn: TopicTurnRow = {
        id: `local-${localIdCounterRef.current}`,
        turnIndex: data.userTurnIndex,
        role: "user",
        content: trimmed,
      }
      const aiTurn: TopicTurnRow = {
        id: data.turn.id,
        turnIndex: data.userTurnIndex + 1,
        role: "ai5",
        content: data.turn.content,
      }
      setTurns((prev) => [...prev, userTurn, aiTurn])
      setText("")
      if (data.capReachedNow) setStatus("awaiting_end")
    } catch {
      setErrorText("通信エラーが発生しました。もう一度お試しください。")
    } finally {
      setSending(false)
    }
  }

  const finishSession = async () => {
    setFinishing(true)
    setErrorText(null)
    try {
      const res = await fetch(`/api/topic/sessions/${sessionId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      if (!res.ok) {
        if (res.status === 429) {
          setErrorText("しばらく時間をおいてから再度お試しください。")
        } else {
          setErrorText("添削に失敗しました。もう一度お試しください。")
        }
        return
      }
      const data: { grading: TopicSessionGrading } = await res.json()
      setGrading(data.grading)
      setStatus("completed")
    } catch {
      setErrorText("通信エラーが発生しました。もう一度お試しください。")
    } finally {
      setFinishing(false)
    }
  }

  if (done && grading) {
    return (
      <div className="p-6 md:p-8 space-y-6 max-w-3xl mx-auto w-full">
        <div className="border-b border-border/60 pb-5">
          <span className="text-xs font-semibold text-primary uppercase tracking-wider">Result</span>
          <h1 className="text-2xl font-bold tracking-tight mt-1">会話の添削結果</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            詰まった構文や語彙は弱点プールに記録されました。振り返りから復習できます。
          </p>
        </div>

        <TopicSessionResultCard grading={grading} turns={turns} />

        <div className="flex flex-wrap gap-3 pt-2">
          <Button onClick={() => router.push("/practice/topic")}>トピック説明に戻る</Button>
          <Button variant="secondary" render={<Link href="/review" />} nativeButton={false}>
            弱点を振り返る
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8 space-y-5 max-w-3xl mx-auto w-full">
      <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <span className="text-xs font-semibold text-primary uppercase tracking-wider">Topic</span>
          <h1 className="text-2xl font-bold tracking-tight mt-1">会話中</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            英語で答えてください。間違いは会話中には指摘されません。終えたときにまとめて添削します。
          </p>
        </div>
        <Link href="/practice/topic" className="shrink-0 text-xs text-muted-foreground underline">
          一覧へ
        </Link>
      </div>

      {errorText && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
          {errorText}
        </div>
      )}

      <div className="space-y-4">
        {turns.map((turn) => (
          <div key={turn.id} className={turn.role === "ai5" ? "flex justify-start" : "flex justify-end"}>
            <div
              className={
                turn.role === "ai5"
                  ? "max-w-[85%] rounded-2xl rounded-tl-sm bg-muted px-4 py-2.5 text-sm leading-relaxed text-foreground"
                  : "max-w-[85%] rounded-2xl rounded-tr-sm bg-primary/10 px-4 py-2.5 text-sm leading-relaxed text-foreground"
              }
            >
              {turn.content}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-tl-sm bg-muted px-4 py-2.5">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {capReached ? (
        <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
          今回の会話はここまでです。添削を受けて締めくくりましょう。
        </div>
      ) : (
        <div className="space-y-2">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="英語で答えてみましょう"
            maxLength={MAX_TOPIC_MESSAGE_LENGTH}
            rows={3}
            disabled={sending || finishing}
          />
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">残り{remainingTurns}回</span>
            <Button onClick={submitTurn} disabled={sending || finishing || text.trim().length === 0} className="gap-1.5">
              {sending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  送信中...
                </>
              ) : (
                <>
                  <SendHorizontal className="size-4" />
                  送信
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      <div className="border-t border-border/60 pt-4">
        <Button
          variant={capReached ? "default" : "secondary"}
          onClick={finishSession}
          disabled={finishing || sending || userTurnCount === 0}
          className="gap-1.5"
        >
          {finishing ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              添削中...
            </>
          ) : (
            <>
              <Sparkles className="size-4" />
              終了して添削してもらう
            </>
          )}
        </Button>
        {userTurnCount === 0 && (
          <p className="text-xs text-muted-foreground mt-2">
            1回以上答えると添削を受けられます。
          </p>
        )}
      </div>
    </div>
  )
}
