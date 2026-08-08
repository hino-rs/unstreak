import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(req: NextRequest) {
    const supabase = await createClient();

    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const { imageUrl, userText } = await req.json();

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            'x-api-key': process.env.ANTHROPIC_API_KEY!,
            'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
            model: 'claude-sonnet-5',
            max_tokens: 1024,
            messages: [{
                role: 'user',
                content: [
                    { type: 'image', source: { type: 'url', url: imageUrl } },
                    {
                        type: 'text',
                        text: `この画像に対する英語学習者の説明文を採点してください。文法・語彙の正しさを中心に見つつ、明らかな事実誤認があれば指摘してください。説明の網羅性は評価対象に含めないでください。\n\n学習者の説明: ${userText}`,
                    },
                ],
            }],
        }),
    });

    return NextResponse.json(await claudeRes.json());
}
