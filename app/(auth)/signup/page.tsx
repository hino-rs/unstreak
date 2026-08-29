import Link from "next/link";
import { signup } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { zenMaruGothic } from "@/lib/fonts";
import { GRADE_BANDS, GRADE_BAND_LABELS } from "@/lib/level";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className={`w-full max-w-md rounded-3xl border border-border/70 bg-white p-8 shadow-sm ${zenMaruGothic.className}`}>
      <div className="text-xs font-semibold tracking-widest text-violet-500 uppercase mb-2">
        はじめまして
      </div>
      <h1 className="text-2xl font-bold text-slate-900 mb-1">無料ではじめる</h1>
      <p className="text-sm text-slate-400 mb-6">クレジットカード不要・1分で開始</p>

      {error ? (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <form action={signup} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="signup-email">メールアドレス</Label>
          <Input type="email" name="email" id="signup-email" required />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="signup-password">パスワード</Label>
          <PasswordInput name="password" id="signup-password" required />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="signup-grade-band">学年</Label>
          <Select name="grade_band" required>
            <SelectTrigger id="signup-grade-band" className="w-full">
              <SelectValue placeholder="選択してください" />
            </SelectTrigger>
            <SelectContent>
              {GRADE_BANDS.map((band) => (
                <SelectItem key={band} value={band}>
                  {GRADE_BAND_LABELS[band]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          type="submit"
          className="w-full mt-2 h-11 bg-violet-600 text-white hover:bg-violet-600/90"
        >
          アカウントを作成
        </Button>
      </form>

      <p className="text-sm text-slate-500 text-center mt-6">
        すでにアカウントをお持ちの方は{" "}
        <Link href="/login" className="text-violet-600 font-medium hover:underline">
          ログイン
        </Link>
      </p>
    </div>
  );
}
