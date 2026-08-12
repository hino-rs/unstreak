import Link from "next/link";
import { login } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { zenMaruGothic } from "@/lib/fonts";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className={`w-full max-w-md rounded-3xl border border-border/70 bg-white p-8 shadow-sm ${zenMaruGothic.className}`}>
      <div className="text-xs font-semibold tracking-widest text-violet-500 uppercase mb-2">
        おかえりなさい
      </div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">ログイン</h1>

      {error ? (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <form action={login} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="login-email">メールアドレス</Label>
          <Input type="email" name="email" id="login-email" required />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="login-password">パスワード</Label>
          <Input type="password" name="password" id="login-password" required />
        </div>

        <Button
          type="submit"
          className="w-full mt-2 h-11 bg-violet-600 text-white hover:bg-violet-600/90"
        >
          ログイン
        </Button>
      </form>

      <p className="text-sm text-slate-500 text-center mt-6">
        アカウントをお持ちでない方は{" "}
        <Link href="/signup" className="text-violet-600 font-medium hover:underline">
          無料ではじめる
        </Link>
      </p>
    </div>
  );
}
