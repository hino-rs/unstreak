import { redirect } from "next/navigation"
import { createSupabaseClient } from "@/lib/supabase/server"
import { getPaintingCatalog, getCompletedPaintingSlugs } from "@/lib/paintings"
import { PaintingCatalogView } from "./painting-catalog-view"

export default async function PaintingCurriculumPage() {
  const supabase = await createSupabaseClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) {
    redirect("/login")
  }

  const [paintings, completedSlugs] = await Promise.all([
    getPaintingCatalog(supabase),
    getCompletedPaintingSlugs(supabase, user.id),
  ])

  return <PaintingCatalogView paintings={paintings} initialCompletedSlugs={completedSlugs} />
}
