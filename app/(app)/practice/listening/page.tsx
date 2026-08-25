import { redirect } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase/server";
import { getListeningScenarioCatalog } from "@/lib/listening";
import { ListeningCatalogView } from "./listening-catalog-view";

export default async function ListeningCatalogPage() {
  const supabase = await createSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    redirect("/login");
  }

  const scenarios = await getListeningScenarioCatalog(supabase);

  return <ListeningCatalogView scenarios={scenarios} />;
}
