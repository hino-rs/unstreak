import { NextRequest, NextResponse } from "next/server"
import { createSupabaseClient } from "@/lib/supabase/server"
import { checkRateLimit } from "@/lib/rate-limit"
import { isAcceptableAnswer } from "@/lib/training/normalize-answer"
import type { MaterialRef } from "@/lib/training/quick-queue"

const MAX_ANSWER_LENGTH = 200

type GradeRequest = {
  materialRef: MaterialRef
  answer: string
}

function isValidGradeRequest(body: unknown): body is GradeRequest {
  if (typeof body !== "object" || body === null) return false
  const b = body as Record<string, unknown>
  const materialRef = b.materialRef as Record<string, unknown> | undefined
  return (
    typeof materialRef === "object" &&
    materialRef !== null &&
    typeof materialRef.ai2QueryId === "string" &&
    materialRef.ai2QueryId.length > 0 &&
    typeof b.answer === "string" &&
    b.answer.length > 0 &&
    b.answer.length <= MAX_ANSWER_LENGTH
  )
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const rateLimitResult = await checkRateLimit(user.id)
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: "too many requests" },
      { status: 429, headers: { "Retry-After": String(rateLimitResult.retryAfterSeconds) } },
    )
  }

  const rawBody: unknown = await req.json()
  if (!isValidGradeRequest(rawBody)) {
    return NextResponse.json({ error: "invalid request body" }, { status: 400 })
  }
  const { materialRef, answer } = rawBody

  const { data, error } = await supabase
    .from("ai2_queries")
    .select("concept_key, revealed_answer")
    .eq("id", materialRef.ai2QueryId)
    .eq("user_id", user.id)
    .single()

  if (error || !data || !data.revealed_answer) {
    return NextResponse.json({ error: "material not found" }, { status: 404 })
  }

  const expected = data.revealed_answer
  const correct = isAcceptableAnswer(answer, expected)

  if (correct) {
    const { error: decrementError } = await supabase.rpc("decrement_weak_point", {
      p_user_id: user.id,
      p_concept_key: data.concept_key,
    })
    if (decrementError) {
      console.error("[training/quick/grade] decrement_weak_point failed:", decrementError)
    }
  }

  return NextResponse.json({ correct, expected, explanation: null })
}
