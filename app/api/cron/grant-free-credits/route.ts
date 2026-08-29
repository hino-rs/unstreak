import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Vercel Cronから毎月1回呼ばれる。CRON_SECRET環境変数を設定すると、
// VercelはAuthorizationヘッダーに同じ値を自動付与して呼び出す。
// 参照: docs/料金プラン設計.md
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("grant_monthly_free_credits");
  if (error) {
    console.error("[cron grant-free-credits] failed:", error);
    return NextResponse.json({ error: "grant failed" }, { status: 500 });
  }

  return NextResponse.json({ granted: data });
}
