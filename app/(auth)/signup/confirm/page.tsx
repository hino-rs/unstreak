import Link from "next/link";
import { zenMaruGothic } from "@/lib/fonts";
import { ConfirmationStatus } from "./confirmation-status";

export default async function SignupConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <div className={`w-full max-w-md rounded-3xl border border-border/70 bg-white p-8 shadow-sm text-center ${zenMaruGothic.className}`}>
      <ConfirmationStatus email={email ?? null} />

      <p className="text-sm text-slate-500 mt-6">
        <Link href="/login" className="text-violet-600 font-medium hover:underline">
          ログイン画面に戻る
        </Link>
      </p>
    </div>
  );
}
