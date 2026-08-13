import { createSupabaseClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { TrainingView, type TrainingData, type TrainingModeSummary } from "./training-view"
import { buildQuickQueue } from "@/lib/training/quick-queue"

type WeakPointRow = {
  concept_key: string
  category: string
  display_label: string | null
  times_flagged: number
}

function summarize(points: WeakPointRow[]): TrainingModeSummary {
  const sorted = [...points].sort((a, b) => b.times_flagged - a.times_flagged)
  return {
    conceptCount: points.length,
    totalFlagged: points.reduce((sum, w) => sum + w.times_flagged, 0),
    topLabels: sorted.slice(0, 3).map((w) => w.display_label ?? w.concept_key),
  }
}

async function getTrainingData(): Promise<TrainingData> {
  const supabase = await createSupabaseClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect("/login")
  }

  const { data: weakPoints, error } = await supabase
    .from("weak_points")
    .select("concept_key, category, display_label, times_flagged")
    .eq("user_id", user.id)

  if (error) {
    console.error("[training] weak_pointsからの取得に失敗:", error)
  }

  const points = (weakPoints as WeakPointRow[]) ?? []
  // しっかり(文法)は語彙以外すべて。isQuickModeConceptの否定だと「卒業済み(times_flagged=0)の
  // 語彙」まで拾ってしまうため、ここではcategoryだけで明示的に切り分ける。
  const focusedPoints = points.filter((w) => w.category !== "vocabulary")

  // サクッと(語彙)の件数は weak_points の行数ではなく、実際にキュー化できる件数で出す。
  // ai2_queries側に有効な素材(プレースホルダ/引用形フィルタを通過するもの)が無い弱点は
  // buildQuickQueueでもスキップされるため、ここでも同じ関数で揃えないと「件数はあるのに
  // はじめると0件」という食い違いが起きる。
  const quickItems = await buildQuickQueue(supabase, user.id, Number.POSITIVE_INFINITY)
  const quickSummary: TrainingModeSummary = {
    conceptCount: quickItems.length,
    totalFlagged: quickItems.reduce((sum, item) => sum + item.timesFlagged, 0),
    topLabels: quickItems.slice(0, 3).map((item) => item.displayLabel ?? item.conceptKey),
  }

  return {
    quick: quickSummary,
    focused: summarize(focusedPoints),
    totalConceptCount: quickSummary.conceptCount + focusedPoints.length,
  }
}

export default async function TrainingPage() {
  const data = await getTrainingData()

  return <TrainingView data={data} />
}
