import { NextRequest, NextResponse } from "next/server";
import { createSupabaseClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { getListeningTurns, computeFailedClarificationStreak } from "@/lib/listening";

// 書き起こし本文は既にTTS再生用にクライアントへ送信済みのため、このエンドポイントは
// 「2回連続の聞き返し失敗」をサーバー側で再検証してログを残すだけのログ専用エンドポイント。
// クレジット消費なし
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: sessionId } = await params;
  const supabase = await createSupabaseClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const rateLimitResult = await checkRateLimit(user.id);
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: "too many requests" },
      { status: 429, headers: { "Retry-After": String(rateLimitResult.retryAfterSeconds) } }
    );
  }

  const { data: session, error: sessionError } = await supabase
    .from("listening_sessions")
    .select("id, transcript_revealed")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (sessionError || !session) {
    return NextResponse.json({ error: "session not found" }, { status: 404 });
  }

  const turns = await getListeningTurns(supabase, sessionId);
  if (computeFailedClarificationStreak(turns) < 2) {
    return NextResponse.json({ error: "reveal not allowed yet" }, { status: 403 });
  }

  if (!session.transcript_revealed) {
    const { error: updateError } = await supabase
      .from("listening_sessions")
      .update({ transcript_revealed: true, transcript_revealed_at: new Date().toISOString() })
      .eq("id", sessionId)
      .eq("user_id", user.id);
    if (updateError) {
      console.error("[listening/reveal-transcript] update failed:", updateError);
    }
  }

  return NextResponse.json({ ok: true });
}
