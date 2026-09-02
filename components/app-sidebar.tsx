"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { fredoka } from "@/lib/fonts";
import {
    Home,
    ImageIcon,
    NotebookPen,
    MessagesSquare,
    History,
    Dumbbell,
    Settings,
    Lock,
    FileText,
    ShieldCheck,
    Palette,
    Headphones,
} from "lucide-react";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
    SidebarSeparator,
} from "@/components/ui/sidebar";
import { UserIcon } from "@/components/user-icon";
import { CreditBalanceBadge } from "@/components/credit-balance-badge";
import type { User } from "@supabase/supabase-js";

const navItems = [
    { href: "/dashboard", label: "ホーム", icon: Home },
    { href: "/practice/describe", label: "画像説明ドリル", icon: ImageIcon },
    { href: "/practice/painting", label: "絵画ドリル", icon: Palette },
    { href: "/practice/listening", label: "リスニング", icon: Headphones },
    { href: "/practice/diary", label: "日記", icon: NotebookPen, locked: true },
    { href: "/practice/topic", label: "トピック説明", icon: MessagesSquare },
    { href: "/review", label: "振り返り", icon: History },
    { href: "/training", label: "特訓", icon: Dumbbell },
    { href: "/settings", label: "設定", icon: Settings },
];

const legalLinks = [
    { href: "/terms", label: "利用規約", icon: FileText },
    { href: "/privacy", label: "プライバシーポリシー", icon: ShieldCheck },
    { href: "/tokushoho", label: "特定商取引法に基づく表記", icon: FileText },
];

export function AppSidebar({ user, credits }: { user: User | null; credits: number | null }) {
    const pathname = usePathname();

    return (
        <Sidebar collapsible="icon">
            <SidebarHeader>
                <Link
                    href="/dashboard"
                    className="flex items-center px-2 py-1.5 group-data-[collapsible=icon]:justify-center"
                >
                    <span
                        className={`${fredoka.className} text-2xl font-semibold tracking-tight text-violet-500 group-data-[collapsible=icon]:hidden`}
                    >
                        Unstreak
                    </span>
                    <span
                        className={`${fredoka.className} hidden text-2xl font-semibold tracking-tight text-violet-500 group-data-[collapsible=icon]:block`}
                    >
                        U
                    </span>
                </Link>
            </SidebarHeader>

            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {navItems.map((item) => {
                                const isActive =
                                    pathname === item.href || pathname?.startsWith(`${item.href}/`);
                                if (item.locked) {
                                    return (
                                        <SidebarMenuItem key={item.href}>
                                            <SidebarMenuButton
                                                type="button"
                                                disabled
                                                aria-disabled="true"
                                                tooltip={`${item.label}（近日公開）`}
                                                className="cursor-not-allowed text-muted-foreground opacity-70"
                                            >
                                                <item.icon />
                                                <span>{item.label}</span>
                                                <Lock className="ml-auto size-3.5" />
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    );
                                }
                                return (
                                    <SidebarMenuItem key={item.href}>
                                        <SidebarMenuButton
                                            isActive={isActive}
                                            tooltip={item.label}
                                            render={<Link href={item.href} />}
                                        >
                                            <item.icon />
                                            <span>{item.label}</span>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                );
                            })}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>

            <SidebarFooter>
                {user ? (
                    <>
                        <SidebarMenu>
                            {legalLinks.map((item) => (
                                <SidebarMenuItem key={item.href}>
                                    <SidebarMenuButton
                                        size="sm"
                                        tooltip={item.label}
                                        className="text-muted-foreground"
                                        render={<Link href={item.href} />}
                                    >
                                        <item.icon />
                                        <span>{item.label}</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                        <SidebarSeparator />
                        {credits !== null && <CreditBalanceBadge initialCredits={credits} />}
                        <div className="flex items-center gap-2 px-1 py-1 group-data-[collapsible=icon]:justify-center">
                            <UserIcon user={user} />
                            <span className="min-w-0 truncate text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
                                {user.email}
                            </span>
                        </div>
                    </>
                ) : (
                    <span className="px-2 text-xs text-muted-foreground">ログインしてください</span>
                )}
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    );
}
