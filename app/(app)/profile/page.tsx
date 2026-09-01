import { redirect } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase/server";
import { ProfileView } from "./profile-view";

export default async function ProfilePage() {
  const supabase = await createSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("grade_band, level_score")
    .eq("user_id", user.id)
    .single();

  return (
    <ProfileView
      email={user.email ?? ""}
      createdAt={user.created_at}
      gradeBand={profile?.grade_band ?? null}
      levelScore={profile?.level_score ?? null}
    />
  );
}
