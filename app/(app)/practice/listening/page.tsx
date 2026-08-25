import { redirect } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase/server";
import { getListeningScenarioCatalog, hasCompletedListeningScenario } from "@/lib/listening";
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
  const onboardingScenarios = scenarios
    .filter((s) => s.isOnboarding)
    .sort((a, b) => (a.onboardingStep ?? 0) - (b.onboardingStep ?? 0));
  const tierScenarios = scenarios.filter((s) => !s.isOnboarding);
  const onboardingCompletion = await Promise.all(
    onboardingScenarios.map((s) => hasCompletedListeningScenario(supabase, user.id, s.id))
  );

  return (
    <ListeningCatalogView
      onboardingScenarios={onboardingScenarios}
      onboardingCompletion={onboardingCompletion}
      tierScenarios={tierScenarios}
    />
  );
}
