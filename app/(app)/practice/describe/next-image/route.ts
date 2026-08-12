import { NextResponse } from "next/server";
import { unsplash } from "@/lib/unsplash";
import { createSupabaseClient } from "@/lib/supabase/server";

const QUERIES = [
  // 日常生活
  "person cooking kitchen",
  "family dinner table",
  "person doing laundry",
  "person cleaning house",
  "child brushing teeth",
  "person watering plants",
  "couple grocery shopping",
  "person packing suitcase",
  // 仕事・学校
  "workers office meeting",
  "teacher classroom students",
  "person typing laptop desk",
  "doctor hospital patient",
  "chef restaurant kitchen",
  "construction workers site",
  "person presenting whiteboard",
  "librarian bookshelf library",
  // 外食・カフェ
  "person reading book cafe",
  "friends restaurant dinner",
  "barista coffee shop",
  "people drinking coffee outdoor",
  "bakery customer bread",
  // 公園・屋外・運動
  "children playing park",
  "person jogging morning",
  "people playing basketball",
  "family picnic park",
  "person walking dog park",
  "cyclist riding city street",
  "people yoga outdoor",
  "person fishing lake",
  // 旅行・移動
  "commuters train station",
  "hikers mountain trail",
  "tourist airport luggage",
  "person driving car",
  "people waiting bus stop",
  "traveler map city street",
  // 天候・季節
  "person umbrella rain street",
  "people snow winter walking",
  "family beach summer",
  "person raking autumn leaves",
  "people cherry blossoms park",
  // 買い物・市場
  "market vendor fruit stall",
  "person shopping mall",
  "farmer field harvest",
  "florist flower shop",
  // 家族・イベント
  "wedding celebration outdoor",
  "birthday party children",
  "grandparents grandchildren garden",
  "people concert crowd",
  // 動物
  "dog running park",
  "cat sleeping sofa",
  "person feeding animals farm",
  "bird flying sky",
  // 感情・表情
  "person laughing friends",
  "person tired working late",
  "child crying playground",
  "person surprised gift",
];


export const GET = async () => {
    const supabase = await createSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { data: seen, error: seenError } = await supabase
    .from("drill_attempts")
    .select("image_url")
        .eq("user_id", user.id);

    if (seenError) {
        console.error("[next-image] failed to fetch seen drill_attempts:", seenError);
    }
    const seenUrls = new Set(seen?.map((r) => r.image_url));

    for (let i = 0; i < 5; i++) {
        const QUERY = QUERIES[Math.floor(Math.random() * QUERIES.length)];
        const { data: photo, error } = await unsplash.GET("/photos/random", {
            params: {
                query: { query: QUERY, count: 1, content_filter: "high" },
            },
        });

        if (error) {
            console.error("[next-image] Unsplash API error:", error);
            return NextResponse.json({ error: error.errors?.[0] || "Unsplash API error" }, { status: 502 });
        }

        const p = Array.isArray(photo) ? photo[0] : photo;
        if (!p?.urls?.regular) {
            console.warn("[next-image] unexpected Unsplash response structure:", photo);
            continue;
        }

        if (!seenUrls.has(p.urls.regular)) {
            return NextResponse.json({
                imageUrl: p.urls.regular,
                photographerName: p.user.name,
                photographerUrl: p.user.links.html,
            });
        }
    }

    return NextResponse.json({ error: "no unseen image found, try again" }, { status: 409 });
}
