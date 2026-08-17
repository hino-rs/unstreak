import Link from "next/link"
import { redirect } from "next/navigation"
import { createSupabaseClient } from "@/lib/supabase/server"
import { getPaintingSummaryBySlug } from "@/lib/paintings"
import { PaintingSessionView } from "./painting-session-view"

export default async function PaintingSessionPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createSupabaseClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) {
    redirect("/login")
  }

  const painting = await getPaintingSummaryBySlug(supabase, slug)
  if (!painting) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-3">
        <p className="text-sm text-muted-foreground">絵画が見つかりませんでした。</p>
        <Link href="/practice/painting" className="text-sm text-primary underline">
          一覧に戻る
        </Link>
      </div>
    )
  }

  return <PaintingSessionView painting={painting} />
}
