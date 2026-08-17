import { NextResponse } from "next/server";
import { createSupabaseClient } from "@/lib/supabase/server";

// 相対パス以外(絶対URL、プロトコル相対URLなど)へのオープンリダイレクトを防ぐ。
// nextが指定されていない場合、現状このルートはサインアップの確認メールリンクからしか
// 呼ばれないため、確認完了画面をデフォルトの遷移先にする
function safeNextPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return "/auth/confirmed";
  }
  return value;
}

// ホスト名として妥当な文字列かのみ確認する(改行やパス区切りを含む値を弾く)
const VALID_HOSTNAME = /^[a-zA-Z0-9.-]+(:[0-9]+)?$/;

function resolveRedirectBase(request: Request, origin: string): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const isLocalEnv = process.env.NODE_ENV === "development";
  if (!isLocalEnv && forwardedHost && VALID_HOSTNAME.test(forwardedHost)) {
    return `https://${forwardedHost}`;
  }
  return origin;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));
  const base = resolveRedirectBase(request, origin);

  if (code) {
    const supabase = await createSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    // codeが存在する時点でGoTrueの/verifyは既に処理済み(=メール確認自体は完了している)。
    // exchangeがここで失敗するのは、サインアップ時と別のブラウザ/端末でリンクを開いたため
    // PKCEのcode_verifier(Cookie)が見つからない場合がほとんどで、その場合も
    // 確認完了ページへ送る(セッションが無いことはそのページ側で検知して案内を出し分ける)
    if (error) {
      console.error("セッション確立エラー(メール確認自体は完了済みの可能性あり):", error.message);
    }
    return NextResponse.redirect(`${base}${next}`);
  }

  return NextResponse.redirect(`${base}/login?error=auth-code-error`);
}
