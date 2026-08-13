"use client";

import { useState } from "react";
import Link from "next/link";
import { fredoka } from "@/lib/fonts";
import { LockClosedIcon } from "@heroicons/react/24/solid";
import { Menu, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserIcon } from "@/components/user-icon";
import { AiAssistantPanel } from "@/components/ai-assistant-panel";
import { cn } from "@/lib/utils";
import type { User } from "@supabase/supabase-js";

export function AppShell({ user, children }: { user: User | null; children: React.ReactNode }) {
    const [navOpen, setNavOpen] = useState(false);
    const [aiOpen, setAiOpen] = useState(false);

    return (
        <div className="flex h-screen w-full overflow-hidden bg-background">
            <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-card/80 px-3 backdrop-blur-sm md:hidden">
                <Button variant="ghost" size="icon" onClick={() => setNavOpen(true)} aria-label="ナビゲーションを開く">
                    <Menu />
                </Button>
                <Link href="/dashboard"><span className={`${fredoka.className} text-xl font-semibold tracking-tight text-violet-500`}>Unstreak</span></Link>
                <Button variant="ghost" size="icon" onClick={() => setAiOpen(true)} aria-label="AIアシスタントを開く">
                    <Sparkles />
                </Button>
            </header>

            {(navOpen || aiOpen) && (
                <div
                    className="fixed inset-0 z-40 bg-black/30 md:hidden"
                    onClick={() => { setNavOpen(false); setAiOpen(false); }}
                />
            )}

            <aside
                className={cn(
                    "fixed inset-y-0 left-0 z-50 w-64 shrink-0 p-4 flex flex-col gap-2 overflow-y-auto border-r border-border bg-card transition-transform duration-200 md:relative md:z-auto md:translate-x-0 md:bg-card/30",
                    navOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                <div className="flex items-center justify-between">
                    <Link href="/dashboard"><div className={`${fredoka.className} text-3xl font-semibold tracking-tight text-violet-500`}>Unstreak</div></Link>
                    <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setNavOpen(false)} aria-label="閉じる">
                        <X />
                    </Button>
                </div>

                {user ? (
                    <>
                        <Link href="/dashboard" onClick={() => setNavOpen(false)}><button className="text-left px-3 py-2 rounded hover:bg-gray-100 w-full font-medium text-sm">ホーム</button></Link>
                        <Link href="/practice/describe" onClick={() => setNavOpen(false)}><button className="text-left px-3 py-2 rounded hover:bg-gray-100 w-full font-medium text-sm">画像説明ドリル</button></Link>
                        <Link href="/practice/diary" onClick={() => setNavOpen(false)}><button className="text-left px-3 py-2 rounded hover:bg-gray-100 text-gray-400 flex items-center gap-1.5 w-full font-medium text-sm"><LockClosedIcon className="w-4 h-4" />日記</button></Link>
                        <Link href="/practice/topic" onClick={() => setNavOpen(false)}><button className="text-left px-3 py-2 rounded hover:bg-gray-100 text-gray-400 flex items-center gap-1.5 w-full font-medium text-sm"><LockClosedIcon className="w-4 h-4" />トピック説明</button></Link>
                        <Link href="/review" onClick={() => setNavOpen(false)}><button className="text-left px-3 py-2 rounded hover:bg-gray-100 w-full font-medium text-sm">振り返り</button></Link>
                        <Link href="/training" onClick={() => setNavOpen(false)}><button className="text-left px-3 py-2 rounded hover:bg-gray-100 w-full font-medium text-sm">特訓</button></Link>
                        <Link href="/settings" onClick={() => setNavOpen(false)}><button className="text-left px-3 py-2 rounded hover:bg-gray-100 w-full font-medium text-sm">設定</button></Link>
                        <div className="mt-auto pt-4">
                            <UserIcon user={user} />
                        </div>
                    </>
                ) : (<span>ログインしてください</span>)}
            </aside>

            <main className="flex flex-1 min-w-0 h-full overflow-y-auto flex-col pt-14 md:pt-0">
                {children}
            </main>

            <aside
                className={cn(
                    "fixed inset-y-0 right-0 z-50 w-80 shrink-0 p-4 flex flex-col overflow-y-auto border-l border-border bg-card transition-transform duration-200 md:relative md:z-auto md:translate-x-0 md:bg-card/30",
                    aiOpen ? "translate-x-0" : "translate-x-full"
                )}
            >
                <Button variant="ghost" size="icon" className="self-end md:hidden" onClick={() => setAiOpen(false)} aria-label="閉じる">
                    <X />
                </Button>
                <AiAssistantPanel />
            </aside>
        </div>
    );
}
