"use client"

import { useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { ArrowLeft } from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { NumberTicker } from "@/components/ui/number-ticker"

type Transaction = {
  id: string
  delta: number
  reason: string
  created_at: string
}

type Plan = "standard" | "pro"

type BillingViewProps = {
  credits: number
  subscriptionStatus: string | null
  plan: Plan | null
  transactions: Transaction[]
}

const subscriptionLabel: Record<string, string> = {
  active: "有効",
  past_due: "支払い遅延",
  canceled: "解約済み",
  incomplete: "未完了",
}

const PLAN_CARDS: { plan: Plan | "free"; name: string; price: string; description: string; recommended?: boolean }[] = [
  { plan: "free", name: "Free", price: "¥0/月", description: "月15クレジット。まずはお試しに" },
  { plan: "standard", name: "Standard", price: "¥980/月", description: "月300クレジット", recommended: true },
  { plan: "pro", name: "Pro", price: "¥1,900/月", description: "月700クレジット + 詳細添削 + 弱点トレンドレポート" },
]

const TOPUP_PACKS: { pack: "small" | "medium" | "large"; name: string; priceYen: number; price: string; credits: number }[] = [
  { pack: "small", name: "小", priceYen: 300, price: "¥300", credits: 75 },
  { pack: "medium", name: "中", priceYen: 1000, price: "¥1,000", credits: 300 },
  { pack: "large", name: "大", priceYen: 2000, price: "¥2,000", credits: 690 },
]

const bestValuePack = TOPUP_PACKS.reduce((best, p) =>
  p.priceYen / p.credits < best.priceYen / best.credits ? p : best
).pack

export function BillingView({ credits, subscriptionStatus, plan, transactions }: BillingViewProps) {
  const [loadingAction, setLoadingAction] = useState<string | null>(null)

  const hasActiveSubscription = subscriptionStatus === "active" || subscriptionStatus === "past_due"

  async function goToCheckout(body: { mode: "subscription"; plan: Plan } | { mode: "topup"; pack: "small" | "medium" | "large" }) {
    const actionKey = body.mode === "subscription" ? body.plan : body.pack
    setLoadingAction(actionKey)
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error("checkout session failed")
      const { url } = await res.json()
      window.location.assign(url)
    } catch {
      toast.error("決済ページの作成に失敗しました")
      setLoadingAction(null)
    }
  }

  async function goToPortal() {
    setLoadingAction("portal")
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" })
      if (!res.ok) throw new Error("portal session failed")
      const { url } = await res.json()
      window.location.href = url
    } catch {
      toast.error("管理ページの作成に失敗しました")
      setLoadingAction(null)
    }
  }

  return (
    <div className="p-6 md:p-8 flex flex-col gap-6 max-w-4xl">
      <div className="flex flex-col gap-1">
        <Link
          href="/settings"
          className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          設定に戻る
        </Link>
        <h1 className="text-xl font-semibold">プラン・クレジット</h1>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>クレジット残高</CardTitle>
          {subscriptionStatus && (
            <Badge variant={hasActiveSubscription ? "default" : "secondary"}>
              {subscriptionLabel[subscriptionStatus] ?? subscriptionStatus}
            </Badge>
          )}
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="text-4xl font-semibold tabular-nums">
            <NumberTicker value={credits} />
          </div>
          <p className="text-sm text-muted-foreground">
            クレジットはドリルの添削・リスニング等の利用ごとに消費されます
          </p>
          {hasActiveSubscription && (
            <Button variant="outline" className="w-fit mt-2" onClick={goToPortal} disabled={loadingAction !== null}>
              {loadingAction === "portal" ? "処理中..." : "サブスクリプションを管理"}
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>プラン</CardTitle>
          <CardDescription>Standard/Proはいつでも変更・解約できます</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          {PLAN_CARDS.map((card) => {
            const isCurrent = hasActiveSubscription ? plan === card.plan : card.plan === "free"
            const showRecommended = card.recommended && !isCurrent
            return (
              <div
                key={card.plan}
                className={cn(
                  "flex flex-col gap-3 rounded-2xl border border-border bg-card/50 p-4",
                  isCurrent && "border-primary ring-1 ring-primary/30",
                  showRecommended && "border-violet-400 ring-1 ring-violet-400/40"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-base font-medium">{card.name}</span>
                  {isCurrent ? (
                    <Badge>現在のプラン</Badge>
                  ) : showRecommended ? (
                    <Badge className="bg-violet-500 text-white">おすすめ</Badge>
                  ) : null}
                </div>
                <span className="text-sm text-muted-foreground">{card.price}</span>
                <p className="text-sm text-muted-foreground">{card.description}</p>
                {card.plan !== "free" && !isCurrent && (
                  <Button
                    onClick={() => goToCheckout({ mode: "subscription", plan: card.plan as Plan })}
                    disabled={loadingAction !== null}
                  >
                    {loadingAction === card.plan
                      ? "処理中..."
                      : hasActiveSubscription
                        ? "変更する"
                        : "登録する"}
                  </Button>
                )}
              </div>
            )
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>クレジットを追加購入</CardTitle>
          <CardDescription>サブスクの有無に関わらず購入できます</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          {TOPUP_PACKS.map((p) => (
            <button
              key={p.pack}
              type="button"
              onClick={() => goToCheckout({ mode: "topup", pack: p.pack })}
              disabled={loadingAction !== null}
              className="flex flex-col items-start gap-1 rounded-2xl border border-border p-3 text-left transition-colors hover:border-primary/40 hover:bg-accent/40 disabled:pointer-events-none disabled:opacity-50"
            >
              <div className="flex w-full items-center justify-between gap-2">
                <span className="text-lg font-semibold">{p.price}</span>
                {p.pack === bestValuePack && <Badge variant="secondary">一番お得</Badge>}
              </div>
              <span className="text-sm text-muted-foreground">
                {loadingAction === p.pack ? "処理中..." : `${p.credits}クレジット`}
              </span>
            </button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>最近のクレジット履歴</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground">まだ履歴がありません</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>日時</TableHead>
                  <TableHead>内容</TableHead>
                  <TableHead className="text-right">増減</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>{new Date(t.created_at).toLocaleString("ja-JP")}</TableCell>
                    <TableCell>{t.reason}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {t.delta > 0 ? `+${t.delta}` : t.delta}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
