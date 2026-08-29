"use client";

import { useState } from "react";
import Link from "next/link";
import { fredoka } from "@/lib/fonts";
import { Sparkles } from "lucide-react";
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

export function AppShell({
    user,
    credits,
    defaultSidebarOpen = true,
    children,
}: {
    user: User | null;
    credits: number | null;
    defaultSidebarOpen?: boolean;
    children: React.ReactNode;
}) {
    const [aiOpen, setAiOpen] = useState(false);

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
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setAiOpen(true)}
                            aria-label="AIアシスタントを開く"
                        >
                            <Sparkles />
                        </Button>
                    </header>

                    <div className="sticky top-0 z-30 hidden h-12 shrink-0 items-center border-b border-border bg-background px-2 md:flex">
                        <SidebarTrigger aria-label="サイドバーの開閉" />
                    </div>

                    <div className="flex flex-1 min-h-0 min-w-0">
                        <main className="flex flex-1 min-w-0 flex-col overflow-y-auto">
                            {children}
                        </main>

                        <aside className="hidden md:flex w-80 shrink-0 flex-col gap-2 overflow-y-auto border-l border-border bg-card/30 p-4">
                            <AiAssistantPanel />
                        </aside>
                    </div>
                </SidebarInset>

                <Sheet open={aiOpen} onOpenChange={setAiOpen}>
                    <SheetContent side="right" className="w-80 p-4 md:hidden">
                        <SheetHeader className="sr-only">
                            <SheetTitle>AIアシスタント</SheetTitle>
                            <SheetDescription>AI2 辞書相棒を開きます</SheetDescription>
                        </SheetHeader>
                        <AiAssistantPanel />
                    </SheetContent>
                </Sheet>
            </SidebarProvider>
        </TooltipProvider>
    );
}
