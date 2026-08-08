import { NextRequest, NextResponse } from "next/server";
import { createSupabaseClient } from "@/utils/supabase/server";
import { gradeDescription, toConceptKey } from "@/lib/ai1";

export async function POST(req: NextRequest) {
    const supabase = await createSupabaseClient();

    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    
    const { imageUrl, userText } = await req.json();

    const grading = await gradeDescription(imageUrl, userText);
    
    for (const error of grading.errors) {
        const conceptKey = toConceptKey(error);
        if (!conceptKey) continue;
    }

    return NextResponse.json(grading);


    // const claudeRes = await anthropic.messages.create({
    //     model: "claude-haiku-4-5",
    //     max_tokens: 1024,
    //     tools: [
    //         {
    //             "name": "submit_grading",
    //             "description": "画像描写ドリルの添削結果",
    //             "input_schema": {
    //                 "type": "object",
    //                 "properties": {
    //                     "corrected_text": {
    //                         "type": "string",
    //                         "description": "ユーザーの英文の修正済みフルバージョン"
    //                     },
    //                     "overall_comment": {
    //                         "type": "string",
    //                         "description": "1〜2文の日本語コメント。前向きだが率直に"
    //                     },
    //                     "errors": {
    //                         "type": "array",
    //                         "items": {
    //                             "type": "object",
    //                             "properties": {
    //                                 "category": {
    //                                     "type": "string",
    //                                     "enum": ["grammar", "vocabulary", "unnatural_phrasing", "spelling"]
    //                                 },
    //                                 "grammar_point": {
    //                                     "type": "string",
    //                                     "enum": [
    //                                         "articles", "past_tense", "present_perfect", "prepositions",
    //                                         "plural_agreement", "subject_verb_agreement", "word_order",
    //                                         "comparatives", "conditionals", "modal_verbs", "passive_voice", "other"
    //                                     ],
    //                                     "description": "categoryが'grammar'の時のみ指定"
    //                                 },
    //                                 "vocab_lemma": {
    //                                     "type": "string",
    //                                     "description": "categoryが'vocabulary'の時のみ指定。対象語を辞書形・小文字で"
    //                                 },
    //                                 "user_fragment": { "type": "string", "description": "ユーザーが書いた問題箇所" },
    //                                 "corrected_fragment": { "type": "string", "description": "修正後の該当箇所" },
    //                                 "explanation_ja": { "type": "string", "description": "なぜ違うかの日本語説明、簡潔に" }
    //                             },
    //                             "required": ["category", "user_fragment", "corrected_fragment", "explanation_ja"]
    //                         }
    //                     }
    //                 },
    //                 "required": ["corrected_text", "overall_comment", "errors"]
    //             }
    //         }
    //     ],
    //     messages: [{
    //         role: 'user',
    //         content: [
    //             { type: 'image', source: { type: 'url', url: imageUrl } },
    //             {
    //                 type: 'text',
    //                 text: `この画像に対する英語学習者の説明文を採点してください。文法・語彙の正しさを中心に見つつ、明らかな事実誤認があれば指摘してください。説明の網羅性は評価対象に含めないでください。\n\n学習者の説明: ${userText}`,
    //             },
    //         ],
    //     }],
    // });

    // return NextResponse.json(claudeRes);
}
