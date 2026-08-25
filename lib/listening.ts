import type { SupabaseClient } from "@supabase/supabase-js";

export const MAX_LISTENING_TURNS_PER_SESSION = 24;
// ウォームアップ(is_onboarding)シナリオはすぐ終わる短いセッションに固定する。
// onboarding_stepごとに段階的に伸ばす(1: 自己紹介, 2: 買い物)
const ONBOARDING_TURN_CAPS: Record<number, number> = { 1: 6, 2: 8 };
const DEFAULT_ONBOARDING_MAX_TURNS = 6;

export type ListeningTargetItem = { kind: "vocab" | "reduction"; value: string };

export type ListeningScenarioCatalogItem = {
  id: string;
  slug: string;
  title: string;
  tier: number;
  situationBrief: string;
  isOnboarding: boolean;
  onboardingStep: number | null;
};

export type ListeningScenario = {
  id: string;
  slug: string;
  title: string;
  tier: number;
  situationBrief: string;
  targetVocab: string[];
  targetReductions: string[];
  voiceAccent: string;
  baseRate: number;
  isOnboarding: boolean;
  onboardingStep: number | null;
  maxTurns: number | null;
};

// max_turnsが個別指定されていれば最優先。次にisOnboarding/onboardingStepの短い上限、
// どちらもなければMAX_LISTENING_TURNS_PER_SESSION(通常シナリオのデフォルト)
export function turnCapForScenario(scenario: {
  isOnboarding: boolean;
  onboardingStep: number | null;
  maxTurns: number | null;
}): number {
  if (scenario.maxTurns) return scenario.maxTurns;
  if (!scenario.isOnboarding) return MAX_LISTENING_TURNS_PER_SESSION;
  if (scenario.onboardingStep && ONBOARDING_TURN_CAPS[scenario.onboardingStep]) {
    return ONBOARDING_TURN_CAPS[scenario.onboardingStep];
  }
  return DEFAULT_ONBOARDING_MAX_TURNS;
}

export type ListeningTurnType =
  | "utterance"
  | "user_reply"
  | "clarification_request"
  | "ai_clarification_response";

export type ListeningTurnRow = {
  id: string;
  turnIndex: number;
  role: "ai" | "user";
  turnType: ListeningTurnType;
  content: string;
  targetItemsUsed: ListeningTargetItem[];
  clarificationStrategy: "repeat" | "rephrase" | "slow_down" | null;
};

export async function getListeningScenarioCatalog(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>
): Promise<ListeningScenarioCatalogItem[]> {
  const { data, error } = await supabase
    .from("listening_scenarios")
    .select("id, slug, title, tier, situation_brief, is_onboarding, onboarding_step")
    .order("tier", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((s) => ({
    id: s.id,
    slug: s.slug,
    title: s.title,
    tier: s.tier,
    situationBrief: s.situation_brief,
    isOnboarding: s.is_onboarding,
    onboardingStep: s.onboarding_step,
  }));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapScenarioRow(row: any): ListeningScenario {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    tier: row.tier,
    situationBrief: row.situation_brief,
    targetVocab: (row.target_vocab ?? []) as string[],
    targetReductions: (row.target_reductions ?? []) as string[],
    voiceAccent: row.voice_accent,
    baseRate: Number(row.base_rate),
    isOnboarding: row.is_onboarding,
    onboardingStep: row.onboarding_step,
    maxTurns: row.max_turns,
  };
}

const SCENARIO_COLUMNS =
  "id, slug, title, tier, situation_brief, target_vocab, target_reductions, voice_accent, base_rate, is_onboarding, onboarding_step, max_turns";

export async function getListeningScenarioById(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  id: string
): Promise<ListeningScenario | null> {
  const { data, error } = await supabase
    .from("listening_scenarios")
    .select(SCENARIO_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapScenarioRow(data);
}

export async function getListeningScenarioBySlug(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  slug: string
): Promise<ListeningScenario | null> {
  const { data, error } = await supabase
    .from("listening_scenarios")
    .select(SCENARIO_COLUMNS)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapScenarioRow(data);
}

export async function hasCompletedListeningScenario(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  userId: string,
  scenarioId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("listening_sessions")
    .select("id")
    .eq("user_id", userId)
    .eq("scenario_id", scenarioId)
    .eq("status", "completed")
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

export async function getListeningTurns(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  sessionId: string
): Promise<ListeningTurnRow[]> {
  const { data, error } = await supabase
    .from("listening_turns")
    .select("id, turn_index, role, turn_type, content, target_items_used, clarification_strategy")
    .eq("session_id", sessionId)
    .order("turn_index", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((t) => ({
    id: t.id,
    turnIndex: t.turn_index,
    role: t.role,
    turnType: t.turn_type,
    content: t.content,
    targetItemsUsed: (t.target_items_used ?? []) as ListeningTargetItem[],
    clarificationStrategy: t.clarification_strategy,
  }));
}

// 直近の連続した「聞き返し」回数。ユーザーの通常の返信(reply)が挟まった時点でリセットされる。
// 書き起こし開放判定(2回連続失敗)とTier EWMAの補助シグナルに使う
export function computeFailedClarificationStreak(
  turns: Pick<ListeningTurnRow, "role" | "turnType">[]
): number {
  let streak = 0;
  for (let i = turns.length - 1; i >= 0; i--) {
    const turn = turns[i];
    if (turn.role !== "user") continue;
    if (turn.turnType === "clarification_request") {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

const SLOW_DOWN_RATE_MULTIPLIER = 0.75;
const MIN_TTS_RATE = 0.6;

// AI4のclarification_strategyがslow_downの時だけ、シナリオ基準の話速から実際にTTSを落とす。
// repeat/rephraseは(言い方は変わっても)通常速度のまま
export function turnAudioRate(
  baseRate: number,
  clarificationStrategy: "repeat" | "rephrase" | "slow_down" | null
): number {
  if (clarificationStrategy !== "slow_down") return baseRate;
  return Math.max(MIN_TTS_RATE, baseRate * SLOW_DOWN_RATE_MULTIPLIER);
}

// セッション完了時、聞き返し回数 / AIターン数。低いほど「聞き取れている」
export function computeClarificationRate(
  turns: Pick<ListeningTurnRow, "role" | "turnType">[]
): number {
  const aiTurnCount = turns.filter((t) => t.role === "ai").length;
  const clarificationCount = turns.filter((t) => t.turnType === "clarification_request").length;
  return clarificationCount / Math.max(1, aiTurnCount);
}

// lib/level.ts の LevelLabel/scoreToLabel/LEVEL_ANCHORS パターンを踏襲。
// listening_tier_scoreは1〜5のEWMAスコア、ListeningTierBandは表示・出題用の3段階ラベル
export type ListeningTierBand = "tier1" | "tier2" | "tier3";

export const LISTENING_TIER_ANCHORS: Record<ListeningTierBand, number> = {
  tier1: 1,
  tier2: 3,
  tier3: 5,
};

// listening_scenarios.tier (1|2|3) と揃えるための数値マッピング
export const LISTENING_TIER_NUMBER: Record<ListeningTierBand, number> = {
  tier1: 1,
  tier2: 2,
  tier3: 3,
};

export function scoreToListeningTier(score: number | null | undefined): ListeningTierBand {
  // 未設定(コールドスタート)は中間ではなく易しい側に倒す。初回はまず易しく、というセーフティ
  const s = score ?? LISTENING_TIER_ANCHORS.tier1;
  if (s <= 2) return "tier1";
  if (s <= 4) return "tier2";
  return "tier3";
}

// clarification_rateが低い(=聞き取れている)ほど高いTierと推定する
export function tierEstimateFromClarificationRate(rate: number): ListeningTierBand {
  if (rate >= 0.5) return "tier1";
  if (rate >= 0.2) return "tier2";
  return "tier3";
}

export async function updateListeningTierScore(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  userId: string,
  tierEstimate: ListeningTierBand
): Promise<number | null> {
  const { data, error } = await supabase.rpc("update_listening_tier_score", {
    p_user_id: userId,
    p_tier_estimate: LISTENING_TIER_ANCHORS[tierEstimate],
  });
  if (error) throw error;
  return data;
}
