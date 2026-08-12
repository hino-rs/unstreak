import { NextResponse } from "next/server";
import { createSupabaseClient } from "@/lib/supabase/server";

// 相対パス以外(絶対URL、プロトコル相対URLなど)へのオープンリダイレクトを防ぐ
function safeNextPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return "/dashboard";
  }
  return value;
}

// ホスト名として妥当な文字列かのみ確認する(改行やパス区切りを含む値を弾く)
const VALID_HOSTNAME = /^[a-zA-Z0-9.-]+(:[0-9]+)?$/;

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  if (code) {
    const supabase = await createSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost && VALID_HOSTNAME.test(forwardedHost)) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth-code-error`);
}
