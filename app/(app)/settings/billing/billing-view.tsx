"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
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

type BillingViewProps = {
  credits: number
  subscriptionStatus: string | null
  transactions: Transaction[]
}

const subscriptionLabel: Record<string, string> = {
  active: "有効",
  past_due: "支払い遅延",
  canceled: "解約済み",
  incomplete: "未完了",
}

export function BillingView({ credits, subscriptionStatus, transactions }: BillingViewProps) {
  const [loadingAction, setLoadingAction] = useState<"topup" | "subscription" | "portal" | null>(null)

  const hasActiveSubscription = subscriptionStatus === "active" || subscriptionStatus === "past_due"

  async function goToCheckout(mode: "topup" | "subscription") {
    setLoadingAction(mode)
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      })
      if (!res.ok) throw new Error("checkout session failed")
      const { url } = await res.json()
      window.location.href = url
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
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => goToCheckout("topup")}
              disabled={loadingAction !== null}
            >
              クレジットを購入
            </Button>
            {hasActiveSubscription ? (
              <Button variant="outline" onClick={goToPortal} disabled={loadingAction !== null}>
                サブスクリプションを管理
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => goToCheckout("subscription")}
                disabled={loadingAction !== null}
              >
                サブスクリプションに登録
              </Button>
            )}
          </div>
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
