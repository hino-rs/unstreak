"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { resendConfirmationEmail } from "@/app/(auth)/actions";

export function ResendConfirmationButton({ email }: { email: string }) {
  const [isPending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);

  const handleResend = () => {
    startTransition(async () => {
      const { error } = await resendConfirmationEmail(email);
      if (error) {
        toast.error(error);
        return;
      }
      setSent(true);
      toast.success("確認メールを再送信しました");
    });
  };

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      disabled={isPending || sent}
      onClick={handleResend}
    >
      {sent ? "送信しました" : isPending ? "送信中..." : "確認メールを再送信"}
    </Button>
  );
}
