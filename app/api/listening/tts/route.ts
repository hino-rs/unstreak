import { NextRequest, NextResponse } from "next/server";
import { createSupabaseClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { synthesizeSpeech } from "@/lib/tts";

const MAX_TTS_TEXT_LENGTH = 1000;
const MIN_RATE = 0.5;
const MAX_RATE = 1.5;

// テキストは既にクライアントに渡り済みの発話内容そのもの(会話のログに紐づく非公開情報ではない)なので、
// セッション/ターンの所有権チェックは不要。認証+レート制限のみでコスト濫用を防ぐ
export async function POST(req: NextRequest) {
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

  const { text, rate } = await req.json();
  if (typeof text !== "string" || text.length === 0 || text.length > MAX_TTS_TEXT_LENGTH) {
    return NextResponse.json({ error: "invalid text" }, { status: 400 });
  }
  const parsedRate = typeof rate === "number" && Number.isFinite(rate) ? rate : 1.0;
  const clampedRate = Math.min(MAX_RATE, Math.max(MIN_RATE, parsedRate));

  let audio: Buffer;
  try {
    audio = await synthesizeSpeech({ text, rate: clampedRate });
  } catch (err) {
    console.error("[listening/tts] synthesizeSpeech failed:", err);
    return NextResponse.json({ error: "speech synthesis failed" }, { status: 502 });
  }

  return new NextResponse(new Uint8Array(audio), {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
