import type { SupabaseClient } from "@supabase/supabase-js";
import { toConceptKey, type GradingResult } from "@/lib/ai1";

const WEEKS = 8;
const TOP_N = 5;

export type WeakPointTrend = {
  conceptKey: string;
  category: string;
  displayLabel: string;
  timesFlagged: number;
  // 週ごとの検出回数。古い週→新しい週の順(スパークライン描画用)
  weeklyCounts: number[];
  thisWeekCount: number;
  lastWeekCount: number;
};

function weekBucketIndex(eventTime: number, now: number): number {
  const daysAgo = Math.floor((now - eventTime) / (1000 * 60 * 60 * 24));
  return Math.floor(daysAgo / 7);
}

// Pro限定「弱点プールのトレンドレポート」用。直近8週間で、現在の上位弱点(times_flagged順)が
// 週ごとにどれだけ検出されているかを集計する。docs/料金プラン設計.md参照
export async function getWeakPointTrends(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  userId: string
): Promise<WeakPointTrend[]> {
  const { data: topWeakPoints } = await supabase
    .from("weak_points")
    .select("concept_key, category, display_label, times_flagged")
    .eq("user_id", userId)
    .order("times_flagged", { ascending: false })
    .limit(TOP_N);

  if (!topWeakPoints || topWeakPoints.length === 0) return [];

  const targetKeys = new Set(topWeakPoints.map((w) => w.concept_key as string));
  const now = Date.now();
  const windowStart = new Date(now - WEEKS * 7 * 24 * 60 * 60 * 1000).toISOString();

  // 集計バケツ: conceptKey -> 週インデックス(0=直近週) -> 回数
  const buckets = new Map<string, number[]>();
  for (const key of targetKeys) buckets.set(key, new Array(WEEKS).fill(0));

  const addOccurrence = (conceptKey: string | null, createdAt: string) => {
    if (!conceptKey || !buckets.has(conceptKey)) return;
    const idx = weekBucketIndex(new Date(createdAt).getTime(), now);
    if (idx < 0 || idx >= WEEKS) return;
    buckets.get(conceptKey)![idx]++;
  };

  const [{ data: drills }, { data: queries }] = await Promise.all([
    supabase
      .from("drill_attempts")
      .select("ai1_response, created_at")
      .eq("user_id", userId)
      .gte("created_at", windowStart),
    supabase
      .from("ai2_queries")
      .select("concept_key, was_guess_correct, created_at")
      .eq("user_id", userId)
      .eq("was_guess_correct", false)
      .gte("created_at", windowStart),
  ]);

  for (const d of drills ?? []) {
    const grading = d.ai1_response as GradingResult | null;
    if (!Array.isArray(grading?.errors)) continue;
    for (const err of grading.errors) {
      addOccurrence(toConceptKey(err), d.created_at);
    }
  }

  for (const q of queries ?? []) {
    addOccurrence(q.concept_key, q.created_at);
  }

  return topWeakPoints.map((w) => {
    const weekly = buckets.get(w.concept_key as string) ?? new Array(WEEKS).fill(0);
    return {
      conceptKey: w.concept_key as string,
      category: w.category as string,
      displayLabel: (w.display_label as string | null) ?? w.concept_key,
      timesFlagged: w.times_flagged as number,
      weeklyCounts: [...weekly].reverse(), // 古い週→新しい週
      thisWeekCount: weekly[0],
      lastWeekCount: weekly[1],
    };
  });
}
