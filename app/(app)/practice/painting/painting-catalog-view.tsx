"use client"

import { useState } from "react"
import Link from "next/link"
import { CheckCircle2, Lock, Palette, Sparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { NumberTicker } from "@/components/ui/number-ticker"
import { cn } from "@/lib/utils"
import { PAINTING_STAGE_THRESHOLD, type PaintingCatalogItem } from "@/lib/paintings"

function PaintingCard({ painting, completed }: { painting: PaintingCatalogItem; completed: boolean }) {
  return (
    <Link
      href={`/practice/painting/${painting.slug}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-xs transition-all hover:shadow-md hover:border-primary/50"
    >
      <div className="relative aspect-4/3 w-full overflow-hidden bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={painting.imageUrl}
          alt={painting.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/75 via-black/10 to-transparent" />

        <div className="absolute top-2 right-2">
          {completed ? (
            <Badge className="gap-1 border-0 bg-emerald-500/90 text-[10px] text-white">
              <CheckCircle2 className="size-3" />
              完了
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-[10px] font-normal">
              未着手
            </Badge>
          )}
        </div>

        <div className="absolute bottom-2 left-2.5 right-2.5 text-white">
          <p className="text-xs font-semibold leading-snug drop-shadow-xs line-clamp-1">
            {painting.title}
          </p>
          <p className="text-[10px] opacity-85 drop-shadow-xs">
            {painting.artist} · {painting.year}
          </p>
        </div>
      </div>
    </Link>
  )
}

export function PaintingCatalogView({
  paintings,
  initialCompletedSlugs,
}: {
  paintings: PaintingCatalogItem[]
  initialCompletedSlugs: string[]
}) {
  const [completedSlugs] = useState<string[]>(initialCompletedSlugs)

  const tier1 = paintings.filter((p) => p.tier === 1)
  const completedCount = tier1.filter((p) => completedSlugs.includes(p.slug)).length
  const unlockedStage2 = completedCount >= PAINTING_STAGE_THRESHOLD

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-5xl mx-auto w-full">
      <div className="border-b border-border/60 pb-5">
        <span className="text-xs font-semibold text-primary uppercase tracking-wider">Painting</span>
        <h1 className="text-2xl font-bold tracking-tight mt-1">絵画ドリル</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          名画をよく観て気づいたことを英語で書く → 背景や解釈を知る → もう一度、英語で反応する。
        </p>
      </div>

      {/* 進捗サマリー */}
      <div className="rounded-2xl border border-border/60 bg-card p-4 flex items-center gap-5">
        <div className="flex items-baseline gap-1.5 shrink-0">
          <NumberTicker
            value={completedCount}
            className="text-3xl font-black tracking-tight text-foreground"
          />
          <span className="text-sm text-muted-foreground">/ {tier1.length} 完了</span>
        </div>
        <Progress value={(completedCount / tier1.length) * 100} className="flex-1" />
      </div>

      {/* ステージ1 */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-foreground">ステージ1</h2>
          <Badge variant="outline" className="text-[10px] font-normal">
            史実 vs 神話化
          </Badge>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tier1.map((painting) => (
            <PaintingCard
              key={painting.slug}
              painting={painting}
              completed={completedSlugs.includes(painting.slug)}
            />
          ))}
        </div>
      </div>

      {/* ステージ2（ロック） */}
      <div
        className={cn(
          "rounded-2xl border p-5 flex items-center gap-4 transition-colors",
          unlockedStage2
            ? "border-primary/40 bg-primary/5"
            : "border-dashed border-border/70 bg-muted/20"
        )}
      >
        <div
          className={cn(
            "size-11 rounded-xl flex items-center justify-center shrink-0",
            unlockedStage2 ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
          )}
        >
          {unlockedStage2 ? <Sparkles className="size-5" /> : <Lock className="size-5" />}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">ステージ2</h3>
            <Badge variant="outline" className="text-[10px] font-normal">
              近日公開
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {unlockedStage2
              ? "解放されました！もう少し解釈の分かれる絵画が登場予定です。"
              : `ステージ1を${PAINTING_STAGE_THRESHOLD}枚クリアすると解放されます（あと${Math.max(
                  PAINTING_STAGE_THRESHOLD - completedCount,
                  0
                )}枚）`}
          </p>
        </div>
        <Palette className="size-5 text-muted-foreground/40 shrink-0 hidden sm:block" />
      </div>
    </div>
  )
}
