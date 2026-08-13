"use client"

import { Zap, Dumbbell, Target, CheckCircle2, ArrowRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type TrainingModeSummary = {
  conceptCount: number
  totalFlagged: number
  topLabels: string[]
}

export type TrainingData = {
  quick: TrainingModeSummary
  focused: TrainingModeSummary
  totalConceptCount: number
}

interface ModeCardProps {
  icon: React.ElementType
  title: string
  tagline: string
  description: string
  accentClassName: string
  summary: TrainingModeSummary
  emptyHint: string
}

function ModeCard({ icon: Icon, title, tagline, description, accentClassName, summary, emptyHint }: ModeCardProps) {
  const hasContent = summary.conceptCount > 0

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-xs flex flex-col gap-4 relative overflow-hidden">
      <div className={cn("absolute top-0 left-0 right-0 h-1", accentClassName)} />

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={cn("size-10 rounded-xl flex items-center justify-center shrink-0", accentClassName, "bg-opacity-10")}>
            <Icon className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold tracking-tight">{title}</h3>
              <Badge variant="secondary" className="text-[10px] font-normal">
                {tagline}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          </div>
        </div>
      </div>

      {hasContent ? (
        <>
          <div className="flex items-center gap-4 py-1">
            <div>
              <div className="text-2xl font-extrabold tracking-tight">
                {summary.conceptCount}
                <span className="text-sm font-normal text-muted-foreground ml-1">件</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">対処待ちの弱点</p>
            </div>
            <div className="h-8 w-px bg-border/60" />
            <div>
              <div className="text-2xl font-extrabold tracking-tight">
                {summary.totalFlagged}
                <span className="text-sm font-normal text-muted-foreground ml-1">回</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">累計の指摘回数</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {summary.topLabels.map((label) => (
              <Badge key={label} variant="outline" className="text-[11px] font-normal">
                {label}
              </Badge>
            ))}
          </div>
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center py-4 text-center rounded-xl border border-dashed border-border/70 bg-muted/20">
          <CheckCircle2 className="size-5 text-muted-foreground/60 mb-1.5" />
          <p className="text-xs text-muted-foreground max-w-52">{emptyHint}</p>
        </div>
      )}

      <div className="mt-auto pt-1 flex items-center justify-between gap-3">
        <Button disabled className="cursor-not-allowed">
          はじめる
          <ArrowRight className="size-4" />
        </Button>
        <Badge variant="outline" className="text-[11px] font-normal text-muted-foreground">
          近日公開
        </Badge>
      </div>
    </div>
  )
}

export function TrainingView({ data }: { data: TrainingData }) {
  return (
    <div className="p-6 md:p-8 space-y-6 max-w-5xl mx-auto w-full">
      <div className="border-b border-border/60 pb-5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-primary uppercase tracking-wider">Training</span>
          <Badge variant="secondary" className="text-[11px] font-normal">
            狙い撃ち再出題
          </Badge>
        </div>
        <h1 className="text-2xl font-bold tracking-tight mt-1">特訓</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          あなたが実際に詰まった構文・単語だけを、負荷の軽重に応じて2モードで再出題します
        </p>
      </div>

      {data.totalConceptCount === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center flex flex-col items-center justify-center bg-card/40">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3">
            <Target className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-semibold">まだ特訓する弱点がありません</h3>
          <p className="text-sm text-muted-foreground max-w-sm mt-1">
            画像説明ドリルやAI2辞書相棒への質問を通じて、AIが自動であなたの弱点を蓄積します。
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <ModeCard
            icon={Zap}
            title="サクッと"
            tagline="1〜2分"
            description="語彙・冠詞・前置詞・活用など、形が1点に定まるものを素早く反復"
            accentClassName="text-amber-500 bg-amber-500"
            summary={data.quick}
            emptyHint="語彙・トークン系の弱点はまだありません"
          />
          <ModeCard
            icon={Dumbbell}
            title="しっかり"
            tagline="5分"
            description="語順・比較・仮定法・受動態など、文の組み立てそのものを鍛える"
            accentClassName="text-violet-500 bg-violet-500"
            summary={data.focused}
            emptyHint="構文系の弱点はまだありません"
          />
        </div>
      )}
    </div>
  )
}
