import { NextRequest, NextResponse } from "next/server";
import { createSupabaseClient } from "@/lib/supabase/server";
import { gradeDescription, toConceptKey, toDisplayLabel } from "@/lib/ai1";
import type { GradingError } from "@/lib/ai1";
import { curatePaintingReveal } from "@/lib/ai3";
import {
  getPaintingSummaryBySlug,
  getPaintingFactBaseById,
  matchNoticeableElements,
  fetchPaintingImageAsBase64,
} from "@/lib/paintings";
import { checkRateLimit, withConcurrencyLock, ConcurrencyLimitError } from "@/lib/rate-limit";
import { CREDIT_COSTS, InsufficientCreditsError, consumeCredit, refundCredit } from "@/lib/credits";

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

  const { text } = await req.json();
  if (typeof text !== "string" || text.length === 0 || text.length > MAX_USER_TEXT_LENGTH) {
    return NextResponse.json({ error: "invalid text" }, { status: 400 });
  }

  const painting = await getPaintingSummaryBySlug(supabase, slug);
  if (!painting) {
    return NextResponse.json({ error: "painting not found" }, { status: 404 });
  }
  const factBase = await getPaintingFactBaseById(supabase, painting.id);
  if (!factBase) {
    return NextResponse.json({ error: "painting fact-base not found" }, { status: 500 });
  }

  const bundleCost = CREDIT_COSTS.grade * 2 + CREDIT_COSTS.reveal;

  let payload;
  try {
    payload = await withConcurrencyLock(user.id, async () => {
      await consumeCredit(supabase, user.id, bundleCost, "painting_round1_bundle");
      try {
        const { noticedLabels, missedLabels } = matchNoticeableElements(
          text,
          factBase.noticeableElements,
        );

        const paintingImage = await fetchPaintingImageAsBase64(painting.imageUrl);

        const [round1, ai3] = await Promise.all([
          gradeDescription(paintingImage, text),
          curatePaintingReveal({
            title: painting.title,
            background: factBase.background,
            intent: factBase.intent,
            interpretations: factBase.interpretations,
            noticeableElements: factBase.noticeableElements.map((el) => ({
              label: el.label,
              noticed: noticedLabels.includes(el.label),
            })),
            tourPages: factBase.tourPages,
            round1Text: text,
          }),
        ]);

        const { data: attempt, error: insertError } = await supabase
          .from("painting_attempts")
          .insert({
            user_id: user.id,
            painting_id: painting.id,
            image_url: painting.imageUrl,
            round1_text: text,
            round1_grading: round1,
            reveal_noticed_labels: noticedLabels,
            reveal_missed_labels: missedLabels,
            reveal_narrative: { noticedText: ai3.noticedText, missedText: ai3.missedText },
            reveal_tour_page_bodies: ai3.tourPageBodies,
            credits_charged: bundleCost,
          })
          .select("id")
          .single();
        if (insertError || !attempt) {
          throw insertError ?? new Error("painting_attempts insert returned no row");
        }

        return {
          attemptId: attempt.id as string,
          round1,
          reveal: {
            noticedLabels,
            missedLabels,
            noticedText: ai3.noticedText,
            missedText: ai3.missedText,
            tourPages: factBase.tourPages.map((p, i) => ({
              heading: p.heading,
              focusX: p.focusX,
              focusY: p.focusY,
              zoom: p.zoom,
              body: ai3.tourPageBodies[i],
            })),
          },
        };
      } catch (innerError) {
        try {
          await refundCredit(supabase, user.id, bundleCost, "painting_round1_bundle_refund");
        } catch (refundError) {
          console.error("[painting/round1] refundCredit threw:", refundError);
        }
        throw innerError;
      }
    });
  } catch (e) {
    if (e instanceof ConcurrencyLimitError) {
      return NextResponse.json({ error: "request already in progress" }, { status: 429 });
    }
    if (e instanceof InsufficientCreditsError) {
      return NextResponse.json({ error: "insufficient credits" }, { status: 402 });
    }
    throw e;
  }

  // 弱点プールへの反映(既存 app/api/grade/route.ts と同じパターン)
  const seenKeys = new Set<string>();
  const uniqueErrors: { error: GradingError; conceptKey: string }[] = [];
  for (const err of payload.round1.errors) {
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
        `[painting/round1] upsert_weak_point failed for ${uniqueErrors[i].conceptKey}:`,
        result.reason,
      );
    } else if (result.value.error) {
      console.error(
        `[painting/round1] upsert_weak_point RPC error for ${uniqueErrors[i].conceptKey}:`,
        result.value.error,
      );
    }
  });

  return NextResponse.json(payload);
}
