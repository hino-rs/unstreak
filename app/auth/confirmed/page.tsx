import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { createSupabaseClient } from "@/lib/supabase/server";
import { zenMaruGothic } from "@/lib/fonts";

export default async function AuthConfirmedPage() {
  const supabase = await createSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 bg-slate-50 px-4 py-16">
      <div className={`w-full max-w-md rounded-3xl border border-border/70 bg-white p-8 shadow-sm text-center ${zenMaruGothic.className}`}>
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <CheckCircle2 className="size-7" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">メール認証が完了しました</h1>

        {user ? (
          <>
            <p className="text-sm text-slate-500">
              先ほど登録画面を開いていたタブに戻ってください。自動的に利用を開始できます。
            </p>
            <p className="text-sm text-slate-500 mt-1">
              このタブはそのまま閉じていただいて構いません。
            </p>
          </>
        ) : (
          <>
            <p className="text-sm text-slate-500 mb-6">
              サインアップ時と別のブラウザやアプリでこのリンクを開いたため、自動ログインはできませんでした。お手数ですが、ログイン画面からログインしてください。
            </p>
            <Link
              href="/login"
              className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-violet-600 px-4 text-sm font-medium text-white hover:bg-violet-600/90"
            >
              ログイン画面へ進む
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
