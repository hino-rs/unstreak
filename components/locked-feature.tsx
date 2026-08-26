import Link from "next/link";
import { Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function LockedFeature({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center text-center gap-4 rounded-2xl border border-dashed border-border/70 bg-muted/20 px-6 py-16 max-w-lg mx-auto mt-10">
      <div className="size-12 rounded-xl bg-muted text-muted-foreground flex items-center justify-center">
        <Lock className="size-6" />
      </div>
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-semibold text-foreground">{title}</h1>
        <Badge variant="outline" className="text-[10px] font-normal">
          近日公開
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      <Button render={<Link href="/dashboard" />} nativeButton={false} variant="secondary" size="sm">
        ホームに戻る
      </Button>
    </div>
  );
}
