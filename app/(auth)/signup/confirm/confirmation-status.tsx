"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResendConfirmationButton } from "@/components/resend-confirmation-button";
import { checkSessionExists } from "@/app/(auth)/actions";

const POLL_INTERVAL_MS = 3000;
const REDIRECT_DELAY_MS = 1200;

export function ConfirmationStatus({ email }: { email: string | null }) {
  const router = useRouter();
  const [confirmed, setConfirmed] = useState(false);
  const redirectingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const interval = setInterval(async () => {
      const exists = await checkSessionExists();
      if (cancelled || !exists) return;

      clearInterval(interval);
      setConfirmed(true);
      if (!redirectingRef.current) {
        redirectingRef.current = true;
        setTimeout(() => {
          if (!cancelled) router.push("/dashboard");
        }, REDIRECT_DELAY_MS);
      }
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [router]);

  if (confirmed) {
    return (
      <>
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <CheckCircle2 className="size-7" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">認証が完了しました</h1>
        <p className="text-sm text-slate-500 mb-6">まもなくダッシュボードに移動します。</p>
        <Button className="w-full bg-violet-600 text-white hover:bg-violet-600/90" onClick={() => router.push("/dashboard")}>
          今すぐ利用を始める
        </Button>
      </>
    );
  }

  return (
    <>
      <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-violet-100 text-violet-600">
        <MailCheck className="size-7" />
      </div>
      <h1 className="text-2xl font-bold text-slate-900 mb-2">確認メールを送信しました</h1>
      <p className="text-sm text-slate-500 mb-1">
        {email ? (
          <>
            <span className="font-medium text-slate-700">{email}</span> 宛に
          </>
        ) : null}
        確認メールをお送りしました。
      </p>
      <p className="text-sm text-slate-500 mb-6">
        メール内のリンクをクリックすると、このページが自動的に切り替わります。メールが届かない場合は、迷惑メールフォルダもご確認ください。
      </p>

      {email ? (
        <div className="mb-2">
          <ResendConfirmationButton email={email} />
        </div>
      ) : null}
    </>
  );
}
