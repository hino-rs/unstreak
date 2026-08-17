import { NextRequest, NextResponse } from "next/server";
import { createSupabaseClient } from "@/lib/supabase/server";
import { gradeDescription, toConceptKey, toDisplayLabel } from "@/lib/ai1";
import type { GradingError } from "@/lib/ai1";
import { checkRateLimit, withConcurrencyLock, ConcurrencyLimitError } from "@/lib/rate-limit";
import { CREDIT_COSTS, InsufficientCreditsError, consumeCredit, refundCredit } from "@/lib/credits";
import { scoreToLabel, updateLevelScore } from "@/lib/level";

// next.config.tsのimages.remotePatternsと同じ制約をサーバー側でも強制する
const ALLOWED_IMAGE_HOSTS = new Set(["images.unsplash.com"]);
const MAX_USER_TEXT_LENGTH = 4000;

function isAllowedImageUrl(url: unknown): url is string {
  if (typeof url !== "string") return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && ALLOWED_IMAGE_HOSTS.has(parsed.hostname);
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
    const supabase = await createSupabaseClient();

    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const rateLimitResult = await checkRateLimit(user.id);
    if (!rateLimitResult.success) {
        return NextResponse.json(
            { error: "too many requests" },
            { status: 429, headers: { "Retry-After": String(rateLimitResult.retryAfterSeconds) } },
        );
    }

    const { imageUrl, userText, photographerName, photographerUrl } = await req.json();

    if (!isAllowedImageUrl(imageUrl)) {
        return NextResponse.json({ error: "invalid imageUrl" }, { status: 400 });
    }
    if (typeof userText !== "string" || userText.length === 0 || userText.length > MAX_USER_TEXT_LENGTH) {
        return NextResponse.json({ error: "invalid userText" }, { status: 400 });
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("level_score")
        .eq("user_id", user.id)
        .single();
    const learnerLevel = scoreToLabel(profile?.level_score);

    let grading;
    try {
        grading = await withConcurrencyLock(user.id, async () => {
            await consumeCredit(supabase, user.id, CREDIT_COSTS.grade, "grade");
            try {
                return await gradeDescription(imageUrl, userText, learnerLevel);
            } catch (aiError) {
                try {
                    await refundCredit(supabase, user.id, CREDIT_COSTS.grade, "grade_refund");
                } catch (refundError) {
                    console.error("[grade] refundCredit threw:", refundError);
                }
                throw aiError;
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

    // 提出履歴を保存
    const { error: insertError } = await supabase.from("drill_attempts").insert({
        user_id: user.id,
        image_url: imageUrl,
        image_photographer_name: photographerName ?? null,
        image_photographer_url: photographerUrl ?? null,
        submitted_text: userText,
        ai1_response: grading,
    });
    if (insertError) {
        console.error("[grade] drill_atemts insert failed:", insertError);
    }

    updateLevelScore(supabase, user.id, grading.level_estimate).catch((err) => {
        console.error("[grade] updateLevelScore failed:", err);
    });

    // 弱点プールへの反映
    // 同一提出内で同じconcept_keyが複数出ても1回分としてカウントする
    const seenKeys = new Set<string>();
    const uniqueErrors: { error: GradingError; conceptKey: string }[] = [];
    for (const err of grading.errors) {
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
            `[grade] upsert_weak_point failed for ${uniqueErrors[i].conceptKey}:`,
            result.reason,
        );
        } else if (result.value.error) {
        console.error(
            `[grade] upsert_weak_point RPC error for ${uniqueErrors[i].conceptKey}:`,
            result.value.error,
        );
        }
    });

    return NextResponse.json(grading);
}
