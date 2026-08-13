import { NextResponse } from "next/server"
import { createSupabaseClient } from "@/lib/supabase/server"
import { checkRateLimit } from "@/lib/rate-limit"
import { buildQuickQueue } from "@/lib/training/quick-queue"

export async function GET() {
  const supabase = await createSupabaseClient()

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const rateLimitResult = await checkRateLimit(user.id)
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: "too many requests" },
      { status: 429, headers: { "Retry-After": String(rateLimitResult.retryAfterSeconds) } },
    )
  }

  const items = await buildQuickQueue(supabase, user.id)

  return NextResponse.json({ items })
}
