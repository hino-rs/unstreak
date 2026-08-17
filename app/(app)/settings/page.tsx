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

  const { data: profile } = await supabase
    .from("profiles")
    .select("grade_band, level_score")
    .eq("user_id", user.id)
    .single();

  const { error: deleteError } = await searchParams;

  return (
    <SettingsView
      gradeBand={profile?.grade_band ?? null}
      levelScore={profile?.level_score ?? null}
      deleteError={deleteError ?? null}
    />
  );
}
