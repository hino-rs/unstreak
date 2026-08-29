"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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

const PLAN_CARDS: { plan: Plan | "free"; name: string; price: string; description: string }[] = [
  { plan: "free", name: "Free", price: "¥0/月", description: "月15クレジット。まずはお試しに" },
  { plan: "standard", name: "Standard", price: "¥980/月", description: "月300クレジット" },
  { plan: "pro", name: "Pro", price: "¥1,900/月", description: "月700クレジット + 詳細添削 + 弱点トレンドレポート" },
]

const TOPUP_PACKS: { pack: "small" | "medium" | "large"; name: string; price: string; credits: number }[] = [
  { pack: "small", name: "小", price: "¥300", credits: 75 },
  { pack: "medium", name: "中", price: "¥1,000", credits: 300 },
  { pack: "large", name: "大", price: "¥2,000", credits: 690 },
]

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
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>クレジット残高</CardTitle>
          {subscriptionStatus && (
            <Badge variant={hasActiveSubscription ? "default" : "secondary"}>
              {subscriptionLabel[subscriptionStatus] ?? subscriptionStatus}
            </Badge>
          )}
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="text-4xl font-semibold tabular-nums">
            <NumberTicker value={credits} />
          </div>
          {hasActiveSubscription && (
            <Button variant="outline" className="w-fit" onClick={goToPortal} disabled={loadingAction !== null}>
              サブスクリプションを管理
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
            return (
              <Card key={card.plan} className={isCurrent ? "border-primary" : undefined}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-base">
                    {card.name}
                    {isCurrent && <Badge>現在のプラン</Badge>}
                  </CardTitle>
                  <CardDescription>{card.price}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <p className="text-sm text-muted-foreground">{card.description}</p>
                  {card.plan !== "free" && !isCurrent && (
                    <Button
                      onClick={() => goToCheckout({ mode: "subscription", plan: card.plan as Plan })}
                      disabled={loadingAction !== null}
                    >
                      {hasActiveSubscription ? "変更する" : "登録する"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>クレジットを追加購入</CardTitle>
          <CardDescription>サブスクの有無に関わらず購入できます</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {TOPUP_PACKS.map((p) => (
            <Button
              key={p.pack}
              variant="outline"
              onClick={() => goToCheckout({ mode: "topup", pack: p.pack })}
              disabled={loadingAction !== null}
            >
              {p.price}で{p.credits}クレジット
            </Button>
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
