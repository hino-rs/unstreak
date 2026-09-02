import { cookies } from "next/headers";
import { createSupabaseClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";

export default async function AppPageLayout({ children }: { children: React.ReactNode }) {
    const supabase = await createSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    const cookieStore = await cookies();
    const defaultSidebarOpen = cookieStore.get("sidebar_state")?.value !== "false";
    const defaultAiPanelOpen = cookieStore.get("ai_panel_state")?.value !== "false";

    let credits: number | null = null;
    if (user) {
        const { data: balance } = await supabase
            .from("credit_balances")
            .select("credits")
            .eq("user_id", user.id)
            .single();
        credits = balance?.credits ?? 0;
    }

    return (
        <AppShell
            user={user}
            credits={credits}
            defaultSidebarOpen={defaultSidebarOpen}
            defaultAiPanelOpen={defaultAiPanelOpen}
        >
            {children}
        </AppShell>
    );
}
