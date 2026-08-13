import { createSupabaseClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { buildQuickQueue } from "@/lib/training/quick-queue"
import { QuickView } from "./quick-view"

export default async function TrainingQuickPage() {
  const supabase = await createSupabaseClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect("/login")
  }

  const initialItems = await buildQuickQueue(supabase, user.id)

  return <QuickView initialItems={initialItems} />
}
