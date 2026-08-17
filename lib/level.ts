import type { SupabaseClient } from "@supabase/supabase-js";

export type GradeBand = "elementary" | "junior_high" | "high_school" | "adult";
export const GRADE_BANDS: GradeBand[] = ["elementary", "junior_high", "high_school", "adult"];
export const GRADE_BAND_LABELS: Record<GradeBand, string> = {
  elementary: "小学生",
  junior_high: "中学生",
  high_school: "高校生",
  adult: "大人",
};

// AI1(lib/ai1.ts)のGradingResultSchema.level_estimateの3値enumと一致させること
export type LevelLabel = "beginner" | "intermediate" | "advanced";
export const LEVEL_LABEL_JA: Record<LevelLabel, string> = {
  beginner: "初級",
  intermediate: "中級",
  advanced: "上級",
};

// level_estimate(enum) -> EWMA計算用の数値アンカー
export const LEVEL_ANCHORS: Record<LevelLabel, number> = { beginner: 1, intermediate: 3, advanced: 5 };

// level_score(数値) -> 表示/プロンプト選択用ラベル。未設定時は中級にフォールバック
export function scoreToLabel(score: number | null | undefined): LevelLabel {
  const s = score ?? LEVEL_ANCHORS.intermediate;
  if (s <= 2) return "beginner";
  if (s <= 4) return "intermediate";
  return "advanced";
}

export async function updateLevelScore(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  userId: string,
  levelEstimate: LevelLabel,
): Promise<number | null> {
  const { data, error } = await supabase.rpc("update_level_score", {
    p_user_id: userId,
    p_level_estimate: LEVEL_ANCHORS[levelEstimate],
  });
  if (error) throw error;
  return data;
}
