"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2, MessagesSquare, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { TopicProfile } from "@/lib/topic"

export function TopicStartView({
  profile,
  activeSessionId,
  monthlyLimit,
  usedCount,
}: {
  profile: TopicProfile
  activeSessionId: string | null
  monthlyLimit: number
  usedCount: number
}) {
  const router = useRouter()
  const [starting, setStarting] = useState(false)
  const [errorText, setErrorText] = useState<string | null>(null)

  const remaining = Math.max(monthlyLimit - usedCount, 0)
  const exhausted = remaining === 0 && !activeSessionId

  const handleStart = async () => {
    setStarting(true)
    setErrorText(null)
    try {
      const res = await fetch("/api/topic/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      if (!res.ok) {
        if (res.status === 429) {
          setErrorText(
            "今月の回数を使い切ったか、リクエストが混み合っています。プランを上げると回数と会話相手のモデルが上がります。"
          )
        } else if (res.status === 400) {
          setErrorText("プロフィールの職業・趣味を設定してください。")
        } else {
          setErrorText("会話の開始に失敗しました。もう一度お試しください。")
        }
        return
      }
      const data: { sessionId: string } = await res.json()
      router.push(`/practice/topic/${data.sessionId}`)
    } catch {
      setErrorText("通信エラーが発生しました。もう一度お試しください。")
    } finally {
      setStarting(false)
    }
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-3xl mx-auto w-full">
      <div className="border-b border-border/60 pb-5">
        <span className="text-xs font-semibold text-primary uppercase tracking-wider">Topic</span>
        <h1 className="text-2xl font-bold tracking-tight mt-1">トピック説明</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          あなたの仕事や趣味について、AIが英語で質問します。好きなだけ会話を続けて、終えたときにまとめて添削を受けましょう。
        </p>
      </div>

      {errorText && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
          {errorText}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessagesSquare className="size-4 text-primary" />
            今回の話題のもと
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <dl className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-muted/40 px-3 py-2.5">
              <dt className="text-[11px] font-semibold text-muted-foreground">職業</dt>
              <dd className="text-sm text-foreground mt-0.5">{profile.occupation}</dd>
            </div>
            <div className="rounded-xl bg-muted/40 px-3 py-2.5">
              <dt className="text-[11px] font-semibold text-muted-foreground">趣味</dt>
              <dd className="text-sm text-foreground mt-0.5">{profile.hobbies}</dd>
            </div>
          </dl>
          <p className="text-xs text-muted-foreground">
            話題がしっくりこないときは{" "}
            <Link href="/profile" className="text-primary underline underline-offset-2">
              プロフィール
            </Link>{" "}
            の職業・趣味を書き換えてください。
          </p>
        </CardContent>
      </Card>

      {activeSessionId ? (
        <Card>
          <CardContent className="flex flex-col gap-3 pt-6">
            <p className="text-sm text-foreground">
              進行中の会話があります。続きから再開できます（回数は消費されません）。
            </p>
            <div>
              <Button onClick={() => router.push(`/practice/topic/${activeSessionId}`)} className="gap-1.5">
                続きから再開する
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col gap-3 pt-6">
            <p className="text-sm text-muted-foreground">
              今月の残り回数：
              <span className="font-semibold text-foreground">
                {remaining} / {monthlyLimit}
              </span>
            </p>
            {exhausted ? (
              <p className="text-sm text-foreground">
                今月分は使い切りました。来月また使えます。
                <Link href="/settings/billing" className="text-primary underline underline-offset-2 ml-1">
                  プランを見る
                </Link>
              </p>
            ) : (
              <div>
                <Button onClick={handleStart} disabled={starting} className="gap-1.5">
                  {starting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      準備中...
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-4" />
                      会話を始める
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
