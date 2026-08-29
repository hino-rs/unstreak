import Link from "next/link"
import { redirect } from "next/navigation"
import { createSupabaseClient } from "@/lib/supabase/server"
import {
  getPaintingSummaryBySlug,
  getPaintingFactBaseById,
  getIncompletePaintingAttempt,
} from "@/lib/paintings"
import { PaintingSessionView, type InitialPaintingSession } from "./painting-session-view"

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

  const incompleteAttempt = await getIncompletePaintingAttempt(supabase, user.id, painting.id)

  let initialSession: InitialPaintingSession | null = null
  if (incompleteAttempt) {
    const factBase = await getPaintingFactBaseById(supabase, painting.id)
    const tourPages = (factBase?.tourPages ?? []).map((p, i) => ({
      heading: incompleteAttempt.reveal.tourPageHeadings[i] ?? p.heading,
      body: incompleteAttempt.reveal.tourPageBodies[i] ?? p.groundingBody,
      focusX: p.focusX,
      focusY: p.focusY,
      zoom: p.zoom,
    }))
    initialSession = {
      attemptId: incompleteAttempt.attemptId,
      text1: incompleteAttempt.round1Text,
      grade1: incompleteAttempt.round1Grading,
      reveal: {
        noticedLabels: incompleteAttempt.reveal.noticedLabels,
        missedLabels: incompleteAttempt.reveal.missedLabels,
        noticedText: incompleteAttempt.reveal.noticedText,
        missedText: incompleteAttempt.reveal.missedText,
        tourPages,
      },
      text2: incompleteAttempt.round2Text,
      grade2: incompleteAttempt.round2Grading,
    }
  }

  return <PaintingSessionView painting={painting} initialSession={initialSession} />
}
