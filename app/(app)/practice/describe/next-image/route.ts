import { NextResponse } from "next/server";
import { unsplash } from "@/lib/unsplash";
import { createSupabaseClient } from "@/lib/supabase/server";

const QUERY = "photography";

export const GET = async () => {
    console.log("[DEBUG API] GET /practice/describe/next-image called");
    const supabase = await createSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
        console.error("[DEBUG API] Auth error or user not found:", authError);
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    console.log("[DEBUG API] Authenticated user:", user.id);

    const { data: seen, error: seenError } = await supabase
        .from("drill_attempts")
        .select("image_url")
        .eq("user_id", user.id);
    
    if (seenError) {
        console.warn("[DEBUG API] Error fetching seen drill_attempts:", seenError);
    }
    const seenUrls = new Set(seen?.map((r) => r.image_url));
    console.log("[DEBUG API] Count of seen images:", seenUrls.size);

    for (let i = 0; i < 5; i++) {
        console.log(`[DEBUG API] Attempt ${i + 1}/5 fetching random photo from Unsplash...`);
        const { data: photo, error } = await unsplash.GET("/photos/random", {
            params: {
                query: { query: QUERY, count: 1, content_filter: "high" },
            },
        });

        if (error) {
            console.error("[DEBUG API] Unsplash API error:", error);
            return NextResponse.json({ error: error.errors?.[0] || "Unsplash API error" }, { status: 502 });
        }

        const p = Array.isArray(photo) ? photo[0] : photo;
        if (!p?.urls?.regular) {
            console.warn("[DEBUG API] Unexpected Unsplash response structure:", photo);
            continue;
        }

        if (!seenUrls.has(p.urls.regular)) {
            console.log("[DEBUG API] Found unseen image:", p.urls.regular);
            return NextResponse.json({
                imageUrl: p.urls.regular,
                photographerName: p.user.name,
                photographerUrl: p.user.links.html,
            });
        }
        console.log("[DEBUG API] Image was already seen, retrying...");
    }

    console.warn("[DEBUG API] No unseen image found after 5 attempts");
    return NextResponse.json({ error: "no unseen image found, try again" }, { status: 409 });
}
