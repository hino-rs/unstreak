import type { SupabaseClient } from "@supabase/supabase-js";

// 1セッションで受け付けるユーザー発言の最大数(ソフトキャップ)。
// UI上は「好きなだけ続けられる」体験を保ちつつ、原価の青天井化だけを防ぐための上限。
// ここに達したらセッションはawaiting_endに移り、終了(採点)しかできなくなる。
export const MAX_TOPIC_USER_TURNS = 15;

export const MAX_OCCUPATION_LENGTH = 100;
export const MAX_HOBBIES_LENGTH = 200;
export const MAX_TOPIC_MESSAGE_LENGTH = 2000;

export type TopicProfile = {
  occupation: string;
  hobbies: string;
};

// start_topic_sessionがnullを返した=当月の上限に達した。呼び出し元が429に翻訳する
// (クレジットのInsufficientCreditsError→402と同じ役回り)
export class TopicQuotaExceededError extends Error {
  constructor() {
    super("topic monthly session limit reached");
    this.name = "TopicQuotaExceededError";
  }
}

// プロフィール(職業・趣味)が未設定。UI側のゲートをすり抜けて直接APIを叩かれた場合に使う
export class TopicProfileNotConfiguredError extends Error {
  constructor() {
    super("topic profile not configured");
    this.name = "TopicProfileNotConfiguredError";
  }
}

// 職業・趣味はどちらもNULL/空文字なら「未設定」。AI5が会話の材料を持てないため、
// 未設定ではこの機能を使わせない(DB側のstart_topic_sessionでも同じ判定をしている)。
export function toTopicProfile(profile: {
  occupation?: string | null;
  hobbies?: string | null;
} | null | undefined): TopicProfile | null {
  const occupation = profile?.occupation?.trim();
  const hobbies = profile?.hobbies?.trim();
  if (!occupation || !hobbies) return null;
  return { occupation, hobbies };
}

export type TopicTurnRow = {
  id: string;
  turnIndex: number;
  role: "ai5" | "user";
  content: string;
};

export async function getTopicTurns(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  sessionId: string
): Promise<TopicTurnRow[]> {
  const { data, error } = await supabase
    .from("topic_turns")
    .select("id, turn_index, role, content")
    .eq("session_id", sessionId)
    .order("turn_index", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((t) => ({
    id: t.id,
    turnIndex: t.turn_index,
    role: t.role,
    content: t.content,
  }));
}

export function countUserTurns(turns: TopicTurnRow[]): number {
  return turns.filter((t) => t.role === "user").length;
}

// 当月の消費済みセッション数。カウンタ行は初回利用時に作られるので、無ければ0。
export async function getTopicMonthlyUsage(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  userId: string
): Promise<number> {
  const usageMonth = new Date().toISOString().slice(0, 7) + "-01";
  const { data, error } = await supabase
    .from("topic_session_usage")
    .select("session_count")
    .eq("user_id", userId)
    .eq("usage_month", usageMonth)
    .maybeSingle();
  if (error) throw error;
  return data?.session_count ?? 0;
}
