import type { createSupabaseClient } from "@/lib/supabase/server"
import type { Tables } from "@/types/supabase"
import { isQuickModeConcept } from "@/lib/training/quick-mode"

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseClient>>

type WeakPointRow = Pick<
  Tables<"weak_points">,
  "concept_key" | "category" | "display_label" | "times_flagged" | "last_seen_at"
>

type Ai2QueryRow = Pick<
  Tables<"ai2_queries">,
  "id" | "concept_key" | "question_text" | "revealed_answer" | "was_guess_correct" | "created_at"
>

export type MaterialRef = { ai2QueryId: string }

export type QuickQueueQuestion = {
  conceptKey: string
  displayLabel: string | null
  timesFlagged: number
  cueText: string
  materialRef: MaterialRef
}

export const DEFAULT_QUICK_SESSION_SIZE = 8
const AI2_QUERY_SCAN_WINDOW = 100

// AI2は「奥には○○があるを英語で？」のような、対象がプレースホルダのままの質問に対して
// "There is ～ in the back." のような穴埋めテンプレートで答えることがある。
// 一意に打てる正解が存在しない(採点不能)ため、cue/answerどちらかにプレースホルダ記号が
// 含まれる行は素材として使わずスキップする。
const PLACEHOLDER_PATTERN = /[○◯〇×✕]|～|〜|\.\.\./

// AI2は受動態など構文寄りの質問(本来はgrammar扱いすべきもの)にも「be shown」のような
// 引用形で答えてしまうことがある。キューが求める活用形と一致しないため採点不能になりやすい。
// be/to/having等の補助語で始まる回答は単発の語彙というより構文の引用形とみなしスキップする。
const AUXILIARY_PREFIX_PATTERN = /^(be|to|having?|being)\s+\S/i

function isLiteralMaterial(q: Pick<Ai2QueryRow, "question_text" | "revealed_answer">): boolean {
  const answer = q.revealed_answer ?? ""
  return (
    !PLACEHOLDER_PATTERN.test(q.question_text) &&
    !PLACEHOLDER_PATTERN.test(answer) &&
    !AUXILIARY_PREFIX_PATTERN.test(answer.trim())
  )
}

function materializeVocabItem(
  wp: WeakPointRow,
  ai2Queries: Ai2QueryRow[],
): QuickQueueQuestion | null {
  for (const q of ai2Queries) {
    if (q.concept_key !== wp.concept_key) continue
    if (q.was_guess_correct === true) continue
    if (!q.revealed_answer || !q.question_text) continue
    if (!isLiteralMaterial(q)) continue
    return {
      conceptKey: wp.concept_key,
      displayLabel: wp.display_label,
      timesFlagged: wp.times_flagged,
      cueText: q.question_text,
      materialRef: { ai2QueryId: q.id },
    }
  }
  return null
}

export async function buildQuickQueue(
  supabase: SupabaseServerClient,
  userId: string,
  targetSize: number = DEFAULT_QUICK_SESSION_SIZE,
): Promise<QuickQueueQuestion[]> {
  const [{ data: weakPoints }, { data: ai2Queries }] = await Promise.all([
    supabase
      .from("weak_points")
      .select("concept_key, category, display_label, times_flagged, last_seen_at")
      .eq("user_id", userId),
    supabase
      .from("ai2_queries")
      .select("id, concept_key, question_text, revealed_answer, was_guess_correct, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(AI2_QUERY_SCAN_WINDOW),
  ])

  const candidates = ((weakPoints as WeakPointRow[]) ?? [])
    .filter(isQuickModeConcept)
    .sort((a, b) => {
      if (b.times_flagged !== a.times_flagged) return b.times_flagged - a.times_flagged
      return new Date(a.last_seen_at).getTime() - new Date(b.last_seen_at).getTime()
    })

  const ai2QueryRows = (ai2Queries as Ai2QueryRow[]) ?? []

  const items: QuickQueueQuestion[] = []
  for (const wp of candidates) {
    if (items.length >= targetSize) break
    const item = materializeVocabItem(wp, ai2QueryRows)
    if (item) items.push(item)
  }

  return items
}
