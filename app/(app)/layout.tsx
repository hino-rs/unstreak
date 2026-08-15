import { cookies } from "next/headers";
import { createSupabaseClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";

export default async function AppPageLayout({ children }: { children: React.ReactNode }) {
    const supabase = await createSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    const cookieStore = await cookies();
    const defaultSidebarOpen = cookieStore.get("sidebar_state")?.value !== "false";

    return (
        <AppShell user={user} defaultSidebarOpen={defaultSidebarOpen}>
            {children}
        </AppShell>
    );
}
