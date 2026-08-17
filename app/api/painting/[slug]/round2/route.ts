import { NextRequest, NextResponse } from "next/server";
import { createSupabaseClient } from "@/lib/supabase/server";
import { gradeDescription, toConceptKey, toDisplayLabel } from "@/lib/ai1";
import type { GradingError } from "@/lib/ai1";
import { getPaintingSummaryBySlug, fetchPaintingImageAsBase64 } from "@/lib/paintings";
import { checkRateLimit, withConcurrencyLock, ConcurrencyLimitError } from "@/lib/rate-limit";

const MAX_USER_TEXT_LENGTH = 4000;

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createSupabaseClient();

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const rateLimitResult = await checkRateLimit(user.id);
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: "too many requests" },
      { status: 429, headers: { "Retry-After": String(rateLimitResult.retryAfterSeconds) } },
    );
  }

  const { attemptId, text } = await req.json();
  if (typeof attemptId !== "string" || attemptId.length === 0) {
    return NextResponse.json({ error: "invalid attemptId" }, { status: 400 });
  }
  if (typeof text !== "string" || text.length === 0 || text.length > MAX_USER_TEXT_LENGTH) {
    return NextResponse.json({ error: "invalid text" }, { status: 400 });
  }

  const painting = await getPaintingSummaryBySlug(supabase, slug);
  if (!painting) {
    return NextResponse.json({ error: "painting not found" }, { status: 404 });
  }

  const { data: attempt, error: fetchError } = await supabase
    .from("painting_attempts")
    .select("id, image_url, painting_id, completed_at")
    .eq("id", attemptId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (fetchError || !attempt || attempt.painting_id !== painting.id) {
    return NextResponse.json({ error: "attempt not found" }, { status: 404 });
  }
  if (attempt.completed_at) {
    return NextResponse.json({ error: "round2 already submitted for this attempt" }, { status: 409 });
  }

  // Round2はRound1で前払い済みのためクレジット消費・返金は行わない。
  // 失敗した場合は同じattemptIdでそのまま再送できる(completed_atがnullのまま残る)
  let round2;
  try {
    round2 = await withConcurrencyLock(user.id, async () => {
      const paintingImage = await fetchPaintingImageAsBase64(attempt.image_url);
      return gradeDescription(paintingImage, text);
    });
  } catch (e) {
    if (e instanceof ConcurrencyLimitError) {
      return NextResponse.json({ error: "request already in progress" }, { status: 429 });
    }
    throw e;
  }

  const { error: updateError } = await supabase
    .from("painting_attempts")
    .update({ round2_text: text, round2_grading: round2, completed_at: new Date().toISOString() })
    .eq("id", attemptId)
    .eq("user_id", user.id)
    .is("completed_at", null);
  if (updateError) {
    console.error("[painting/round2] update failed:", updateError);
  }

  // 弱点プールへの反映(既存 app/api/grade/route.ts と同じパターン)
  const seenKeys = new Set<string>();
  const uniqueErrors: { error: GradingError; conceptKey: string }[] = [];
  for (const err of round2.errors) {
    const conceptKey = toConceptKey(err);
    if (!conceptKey || seenKeys.has(conceptKey)) continue;
    seenKeys.add(conceptKey);
    uniqueErrors.push({ error: err, conceptKey });
  }

  const weakPointResults = await Promise.allSettled(
    uniqueErrors.map(({ error: err, conceptKey }) =>
      supabase.rpc("upsert_weak_point", {
        p_user_id: user.id,
        p_concept_key: conceptKey,
        p_category: err.category,
        p_display_label: toDisplayLabel(err),
      }),
    ),
  );
  weakPointResults.forEach((result, i) => {
    if (result.status === "rejected") {
      console.error(
        `[painting/round2] upsert_weak_point failed for ${uniqueErrors[i].conceptKey}:`,
        result.reason,
      );
    } else if (result.value.error) {
      console.error(
        `[painting/round2] upsert_weak_point RPC error for ${uniqueErrors[i].conceptKey}:`,
        result.value.error,
      );
    }
  });

  return NextResponse.json({ round2 });
}
