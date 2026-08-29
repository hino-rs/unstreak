"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Coins } from "lucide-react";
import { cn } from "@/lib/utils";

// クレジット消費は各機能のfetch呼び出し内で起きページ遷移を伴わないため、
// レイアウトのサーバーコンポーネントで一度取得した値は即座に古くなる。
// タブ復帰時・一定間隔での再取得で「現在の」残高に近づける。
const POLL_INTERVAL_MS = 20000;

export function CreditBalanceBadge({
    initialCredits,
    variant = "sidebar",
    className,
}: {
    initialCredits: number;
    variant?: "sidebar" | "compact";
    className?: string;
}) {
    const [credits, setCredits] = useState(initialCredits);

    const refresh = useCallback(async () => {
        try {
            const res = await fetch("/api/credits", { cache: "no-store" });
            if (!res.ok) return;
            const data = await res.json();
            if (typeof data.credits === "number") setCredits(data.credits);
        } catch {
            // ネットワーク不調時は直前の表示値を維持する
        }
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            if (document.visibilityState === "visible") refresh();
        }, POLL_INTERVAL_MS);

        const onVisibilityChange = () => {
            if (document.visibilityState === "visible") refresh();
        };
        document.addEventListener("visibilitychange", onVisibilityChange);
        window.addEventListener("focus", refresh);

        return () => {
            clearInterval(interval);
            document.removeEventListener("visibilitychange", onVisibilityChange);
            window.removeEventListener("focus", refresh);
        };
    }, [refresh]);

    if (variant === "compact") {
        return (
            <Link
                href="/settings/billing"
                className={cn(
                    "flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium tabular-nums text-foreground",
                    className
                )}
                aria-label={`クレジット残高 ${credits}`}
            >
                <Coins className="size-3.5 text-violet-500" />
                {credits}
            </Link>
        );
    }

    return (
        <Link
            href="/settings/billing"
            className={cn(
                "flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground group-data-[collapsible=icon]:justify-center",
                className
            )}
            aria-label={`クレジット残高 ${credits}`}
        >
            <Coins className="size-4 shrink-0 text-violet-500" />
            <span className="tabular-nums font-medium text-foreground group-data-[collapsible=icon]:hidden">
                {credits}
            </span>
            <span className="group-data-[collapsible=icon]:hidden">クレジット</span>
        </Link>
    );
}
