"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { fredoka } from "@/lib/fonts";
import { PanelRightClose, PanelRightOpen, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import {
    SidebarInset,
    SidebarProvider,
    SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AiAssistantPanel } from "@/components/ai-assistant-panel";
import { CreditBalanceBadge } from "@/components/credit-balance-badge";
import type { User } from "@supabase/supabase-js";

const AI_ASSISTANT_PATHS = ["/practice/describe", "/practice/painting", "/practice/listening", "/practice/topic"];

const AI_PANEL_COOKIE_NAME = "ai_panel_state";
const AI_PANEL_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

export function AppShell({
    user,
    credits,
    defaultSidebarOpen = true,
    defaultAiPanelOpen = true,
    children,
}: {
    user: User | null;
    credits: number | null;
    defaultSidebarOpen?: boolean;
    defaultAiPanelOpen?: boolean;
    children: React.ReactNode;
}) {
    const [aiOpen, setAiOpen] = useState(false);
    const [aiPanelOpen, setAiPanelOpen] = useState(defaultAiPanelOpen);
    const pathname = usePathname();
    const showAiAssistant = AI_ASSISTANT_PATHS.some((path) => pathname?.startsWith(path));

    // サイドバーと同じくクッキーに開閉状態を保存して、リロード後も維持する。
    const setAiPanel = useCallback((open: boolean) => {
        setAiPanelOpen(open);
        document.cookie = `${AI_PANEL_COOKIE_NAME}=${open}; path=/; max-age=${AI_PANEL_COOKIE_MAX_AGE}`;
    }, []);

    return (
        <TooltipProvider>
            <SidebarProvider defaultOpen={defaultSidebarOpen}>
                <AppSidebar user={user} credits={credits} />

                <SidebarInset>
                    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border bg-card/80 px-3 backdrop-blur-sm md:hidden">
                        <SidebarTrigger aria-label="ナビゲーションを開く" />
                        <Link href="/dashboard" className="min-w-0 flex-1">
                            <span className={`${fredoka.className} text-xl font-semibold tracking-tight text-violet-500`}>
                                Unstreak
                            </span>
                        </Link>
                        {credits !== null && (
                            <CreditBalanceBadge initialCredits={credits} variant="compact" />
                        )}
                        {showAiAssistant && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setAiOpen(true)}
                                aria-label="AIアシスタントを開く"
                            >
                                <Sparkles />
                            </Button>
                        )}
                    </header>

                    <div className="sticky top-0 z-30 hidden h-12 shrink-0 items-center justify-between border-b border-border bg-background px-2 md:flex">
                        <SidebarTrigger aria-label="サイドバーの開閉" />
                        {showAiAssistant && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="size-7"
                                onClick={() => setAiPanel(!aiPanelOpen)}
                                aria-label={aiPanelOpen ? "AI2 辞書相棒を閉じる" : "AI2 辞書相棒を開く"}
                                aria-expanded={aiPanelOpen}
                            >
                                {aiPanelOpen ? <PanelRightClose /> : <PanelRightOpen />}
                            </Button>
                        )}
                    </div>

                    <div className="flex flex-1 min-h-0 min-w-0">
                        <main className="flex flex-1 min-w-0 flex-col overflow-y-auto">
                            {children}
                        </main>

                        {/* 閉じても質問・履歴が消えないよう、アンマウントせず非表示にする。 */}
                        {showAiAssistant && (
                            <aside
                                className={`w-80 shrink-0 flex-col gap-2 overflow-y-auto border-l border-border bg-card/30 p-4 ${aiPanelOpen ? "hidden md:flex" : "hidden"}`}
                            >
                                <AiAssistantPanel onClose={() => setAiPanel(false)} />
                            </aside>
                        )}
                    </div>
                </SidebarInset>

                {showAiAssistant && (
                    <Sheet open={aiOpen} onOpenChange={setAiOpen}>
                        <SheetContent side="right" className="w-80 p-4 md:hidden">
                            <SheetHeader className="sr-only">
                                <SheetTitle>AIアシスタント</SheetTitle>
                                <SheetDescription>AI2 辞書相棒を開きます</SheetDescription>
                            </SheetHeader>
                            <AiAssistantPanel />
                        </SheetContent>
                    </Sheet>
                )}
            </SidebarProvider>
        </TooltipProvider>
    );
}
