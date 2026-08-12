import { createSupabaseClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";

export default async function AppPageLayout({ children }: { children: React.ReactNode }) {
    const supabase = await createSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    return <AppShell user={user}>{children}</AppShell>;
}
