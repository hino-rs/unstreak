import { NextResponse } from "next/server";
import { createSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
    const supabase = await createSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { data: weak_points, error: getWeakPointsError } = await supabase
        .from("weak_points")
        .select("category, display_label, times_flagged, last_seen_at")
        .eq("user_id", user.id);

    if (getWeakPointsError) {
        console.error("weak_pointsからの取得に失敗:", getWeakPointsError);
        return NextResponse.json({ error: getWeakPointsError }, { status: 500 });
    }
    
    return NextResponse.json({ weak_points }, { status: 200 });
}