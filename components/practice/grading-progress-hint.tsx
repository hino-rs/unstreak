"use client"

import { useEffect, useState } from "react"

const SLOW_THRESHOLD_MS = 15000

export function GradingProgressHint({ loading }: { loading: boolean }) {
  const [prevLoading, setPrevLoading] = useState(loading)
  const [slow, setSlow] = useState(false)

  // loadingが切り替わった瞬間にslowをリセットする(Reactが推奨する
  // 「propの変化に応じたstateのリセット」パターン: レンダー中に行い、effect内では行わない)
  if (loading !== prevLoading) {
    setPrevLoading(loading)
    setSlow(false)
  }

  useEffect(() => {
    if (!loading) return
    const timer = setTimeout(() => setSlow(true), SLOW_THRESHOLD_MS)
    return () => clearTimeout(timer)
  }, [loading])

  if (!loading) return null

  return (
    <p className="text-xs text-muted-foreground mt-1.5">
      {slow ? "もう少しお待ちください(時間がかかっています)" : "通常10秒ほどで返ってきます"}
    </p>
  )
}
