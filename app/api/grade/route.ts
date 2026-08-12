import { NextRequest, NextResponse } from "next/server";
import { createSupabaseClient } from "@/lib/supabase/server";
import { gradeDescription, toConceptKey } from "@/lib/ai1";
import type { GradingError } from "@/lib/ai1";

// weak_points.display_label用のラベル辞書
const grammarPointLabels: Record<string, string> = {
  articles: "冠詞",
  past_tense: "過去形",
  present_perfect: "現在完了形",
  prepositions: "前置詞",
  plural_agreement: "単複の一致",
  subject_verb_agreement: "主語と動詞の一致",
  word_order: "語順",
  comparatives: "比較表現",
  conditionals: "仮定法・条件文",
  modal_verbs: "助動詞",
  passive_voice: "受動態",
  other: "その他文法",
};

function toDisplayLabel(error: GradingError): string | null {
    if (error.category === "grammar" && error.grammar_point) {
        return grammarPointLabels[error.grammar_point] ?? error.grammar_point;
    }
    if (error.category === "vocabulary" && error.vocab_lemma) {
        return error.vocab_lemma.toLowerCase().trim();
    }
    return null;
}

export async function POST(req: NextRequest) {
    const supabase = await createSupabaseClient();

    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    
    const { imageUrl, userText, photographerName, photographerUrl } = await req.json();

    const grading = await gradeDescription(imageUrl, userText);

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
