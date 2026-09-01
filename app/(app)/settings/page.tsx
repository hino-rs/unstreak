import { redirect } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase/server";
import { SettingsView } from "./settings-view";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const supabase = await createSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");

  const { error: deleteError } = await searchParams;

  return <SettingsView deleteError={deleteError ?? null} />;
}
