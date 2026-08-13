import { createSupabaseClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { TrainingView, type TrainingData, type TrainingModeSummary } from "./training-view"

type WeakPointRow = {
  concept_key: string
  category: string
  display_label: string | null
  times_flagged: number
}

// 主形式(B)が文脈非依存の「形」だけで完結するgrammar_point。
// present_perfect/modal_verbsは形はトークン単位だが、選択自体は文脈依存のため
// 別途E/D形式を補助的に使う想定(docs/tokkun-design.md参照)。ここでは主形式基準でサクッとに含める。
const QUICK_MODE_GRAMMAR_POINTS = new Set([
  "articles",
  "prepositions",
  "past_tense",
  "plural_agreement",
  "subject_verb_agreement",
  "present_perfect",
  "modal_verbs",
])

function isQuickModeConcept(w: WeakPointRow): boolean {
  if (w.category === "vocabulary") return true
  const grammarPoint = w.concept_key.replace(/^grammar:/, "")
  return QUICK_MODE_GRAMMAR_POINTS.has(grammarPoint)
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
  const quickPoints = points.filter(isQuickModeConcept)
  const focusedPoints = points.filter((w) => !isQuickModeConcept(w))

  return {
    quick: summarize(quickPoints),
    focused: summarize(focusedPoints),
    totalConceptCount: points.length,
  }
}

export default async function TrainingPage() {
  const data = await getTrainingData()

  return <TrainingView data={data} />
}
