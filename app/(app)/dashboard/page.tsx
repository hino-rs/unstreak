import { redirect } from "next/navigation"
import { SupabaseClient, User } from "@supabase/supabase-js"
import { createSupabaseClient } from "@/lib/supabase/server"
import {
  DashboardView,
  type DashboardData,
  type Activity,
  type Drill,
  type WeakLabelCount,
  type GuessStats,
  type QueryHistoryItem,
  type DailyAccuracyPoint,
  type PaintingProgress,
} from "./dashboard-view"
import type { GradingResult } from "@/lib/ai1"
import { getPaintingCatalog, getCompletedPaintingSlugs } from "@/lib/paintings"

async function getData(): Promise<DashboardData> {
  const supabase = await createSupabaseClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect("/login")
  }

  // 先週比較のために14日前まで取得
  const twoWeeksAgo = new Date()
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
  const twoWeeksStr = twoWeeksAgo.toISOString()

  // 今週と先週の境界 (7日前)
  const oneWeekAgo = new Date()
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

  const [recentDrillResults, guessStats, weaknessFocus, paintingProgress] =
    await Promise.all([
      getRecentDrillResults(supabase, user),
      getGuessStats(supabase, user, twoWeeksStr, oneWeekAgo),
      getWeaknessFocus(supabase, user),
      getPaintingProgress(supabase, user),
    ])

  const recentActivity = getRecentActivity(
    recentDrillResults,
    guessStats.recentQueries
  )

  return {
    guessStats,
    recentActivity,
    weaknessFocus,
    recentDrillResults,
    paintingProgress,
  }
}

async function getPaintingProgress(
  supabase: SupabaseClient,
  user: User
): Promise<PaintingProgress> {
  const [catalog, completedSlugs] = await Promise.all([
    getPaintingCatalog(supabase),
    getCompletedPaintingSlugs(supabase, user.id),
  ])
  const completedSet = new Set(completedSlugs)

  return {
    completed: completedSlugs.length,
    total: catalog.length,
    paintings: catalog.map((p) => ({
      slug: p.slug,
      title: p.title,
      imageUrl: p.imageUrl,
      completed: completedSet.has(p.slug),
    })),
  }
}

async function getRecentDrillResults(
  supabase: SupabaseClient,
  user: User
): Promise<Drill[]> {
  const { data } = await supabase
    .from("drill_attempts")
    .select("image_url, submitted_text, ai1_response, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10)

  const returnData: Drill[] = []

  if (data && data.length > 0) {
    data.forEach((d) => {
      const grading = d.ai1_response as GradingResult | null
      const errorCount = Array.isArray(grading?.errors)
        ? grading.errors.length
        : 0
      returnData.push({
        url: d.image_url,
        attemptDate: d.created_at,
        submittedText: d.submitted_text ?? "",
        gradingResult: grading,
        numErrors: errorCount,
      })
    })
  }

  return returnData
}

async function getGuessStats(
  supabase: SupabaseClient,
  user: User,
  twoWeeksPeriod: string,
  oneWeekDate: Date
): Promise<GuessStats> {
  const { data, error } = await supabase
    .from("ai2_queries")
    .select("id, question_text, user_guess, revealed_answer, was_guess_correct, created_at")
    .eq("user_id", user.id)
    .gte("created_at", twoWeeksPeriod)
    .order("created_at", { ascending: true }) // グラフ時系列順

  if (error || !data || data.length === 0) {
    return {
      percent: 0,
      lastWeekPercent: null,
      diffPercent: null,
      totalCount: 0,
      lastWeekCount: 0,
      correctCount: 0,
      incorrectCount: 0,
      skipCount: 0,
      dailyTrend: [],
      recentQueries: [],
    }
  }

  const oneWeekTime = oneWeekDate.getTime()
  let thisWeekTotal = 0
  let thisWeekCorrect = 0
  let thisWeekIncorrect = 0
  let thisWeekSkip = 0

  let lastWeekTotal = 0
  let lastWeekCorrect = 0

  const recentQueries: QueryHistoryItem[] = []
  const dailyMap = new Map<string, { total: number; correct: number }>()

  data.forEach((d) => {
    const createdAt = new Date(d.created_at)
    const itemTime = createdAt.getTime()

    // 今週と先週の集計
    if (itemTime >= oneWeekTime) {
      thisWeekTotal++
      if (d.was_guess_correct === true) {
        thisWeekCorrect++
      } else if (d.was_guess_correct === false) {
        thisWeekIncorrect++
      } else {
        thisWeekSkip++
      }
    } else {
      lastWeekTotal++
      if (d.was_guess_correct === true) {
        lastWeekCorrect++
      }
    }

    // 質問ログ用（最新順にしたいので先頭に追加）
    recentQueries.unshift({
      id: d.id,
      questionText: d.question_text,
      userGuess: d.user_guess,
      revealedAnswer: d.revealed_answer,
      wasGuessCorrect: d.was_guess_correct,
      createdAt: d.created_at,
    })

    // 日別集計 (記録がある日のみマップに登録)
    const dateKey = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, "0")}-${String(createdAt.getDate()).padStart(2, "0")}`
    const current = dailyMap.get(dateKey) || { total: 0, correct: 0 }
    current.total++
    if (d.was_guess_correct === true) {
      current.correct++
    }
    dailyMap.set(dateKey, current)
  })

  // 記録がある日のみの配列（記録がない日は除外）
  const dailyTrend: DailyAccuracyPoint[] = Array.from(dailyMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([dateKey, stats]) => {
      const parts = dateKey.split("-")
      const monthDay = `${parseInt(parts[1], 10)}/${parseInt(parts[2], 10)}`
      const accuracy = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0
      return {
        date: monthDay,
        fullDate: dateKey,
        accuracy,
        questions: stats.total,
        correct: stats.correct,
      }
    })

  const thisWeekPercent =
    thisWeekTotal > 0 ? (thisWeekCorrect / thisWeekTotal) * 100.0 : 0
  const lastWeekPercent =
    lastWeekTotal > 0 ? (lastWeekCorrect / lastWeekTotal) * 100.0 : null
  const diffPercent =
    lastWeekPercent !== null
      ? Math.round(thisWeekPercent - lastWeekPercent)
      : null

  return {
    percent: thisWeekPercent,
    lastWeekPercent,
    diffPercent,
    totalCount: thisWeekTotal,
    lastWeekCount: lastWeekTotal,
    correctCount: thisWeekCorrect,
    incorrectCount: thisWeekIncorrect,
    skipCount: thisWeekSkip,
    dailyTrend,
    recentQueries,
  }
}

function getRecentActivity(
  recentDrills: Drill[],
  recentQueries: QueryHistoryItem[]
): Activity {
  const numOfDrillAttempts = recentDrills.length
  const lastDrillAttemptDate =
    recentDrills.length > 0 ? recentDrills[0].attemptDate : ""

  const numOfQuestions = recentQueries.length
  const lastQuestionDate =
    recentQueries.length > 0 ? recentQueries[0].createdAt : ""

  return {
    numOfDrillAttempts,
    lastDrillAttemptDate,
    numOfQuestions,
    lastQuestionDate,
    recentDrillAttempts: recentDrills,
    recentQueries,
  }
}

async function getWeaknessFocus(
  supabase: SupabaseClient,
  user: User
): Promise<WeakLabelCount[]> {
  const { data: weakPoints } = await supabase
    .from("weak_points")
    .select("category, display_label, times_flagged")
    .eq("user_id", user.id)

  if (weakPoints && weakPoints.length > 0) {
    const map = new Map<string, number>()
    for (const w of weakPoints) {
      const key = w.display_label ?? "その他文法"
      if (w.category === "grammar") {
        map.set(key, (map.get(key) ?? 0) + (w.times_flagged || 1))
      } else {
        map.set("単語・熟語等", (map.get("単語・熟語等") ?? 0) + (w.times_flagged || 1))
      }
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([label, count]) => ({ label, count }))
  }
  return []
}

export default async function DashboardPage() {
  const data: DashboardData = await getData()

  return <DashboardView initialData={data} />
}
