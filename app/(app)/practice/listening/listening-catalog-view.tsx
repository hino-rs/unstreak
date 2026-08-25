"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Headphones, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ListeningScenarioCatalogItem } from "@/lib/listening";

const TIER_LABELS: Record<number, string> = { 1: "Tier 1", 2: "Tier 2", 3: "Tier 3" };

function ScenarioCard({
  scenario,
  starting,
  onStart,
}: {
  scenario: ListeningScenarioCatalogItem;
  starting: boolean;
  onStart: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card p-4 shadow-xs">
      <div className="flex items-center justify-between">
        <Badge variant="outline" className="text-[10px] font-normal">
          {TIER_LABELS[scenario.tier] ?? `Tier ${scenario.tier}`}
        </Badge>
        <Headphones className="size-4 text-muted-foreground/50" />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-foreground">{scenario.title}</h3>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{scenario.situationBrief}</p>
      </div>
      <Button size="sm" className="mt-1 gap-1.5" disabled={starting} onClick={() => onStart(scenario.id)}>
        {starting && <Loader2 className="size-3.5 animate-spin" />}
        <span>はじめる</span>
      </Button>
    </div>
  );
}

export function ListeningCatalogView({ scenarios }: { scenarios: ListeningScenarioCatalogItem[] }) {
  const router = useRouter();
  const [startingId, setStartingId] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  const handleStart = async (scenarioId: string) => {
    if (startingId) return;
    setStartingId(scenarioId);
    setErrorText(null);
    try {
      const res = await fetch("/api/listening/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarioId }),
      });
      if (!res.ok) {
        if (res.status === 402) {
          setErrorText("クレジットが不足しています。設定画面から追加してください。");
        } else if (res.status === 429) {
          setErrorText("しばらく時間をおいてから再度お試しください。");
        } else {
          setErrorText("会話の開始に失敗しました。もう一度お試しください。");
        }
        return;
      }
      const data: { sessionId: string } = await res.json();
      router.push(`/practice/listening/${data.sessionId}`);
    } catch {
      setErrorText("通信エラーが発生しました。もう一度お試しください。");
    } finally {
      setStartingId(null);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-5xl mx-auto w-full">
      <div className="border-b border-border/60 pb-5">
        <span className="text-xs font-semibold text-primary uppercase tracking-wider">Listening</span>
        <h1 className="text-2xl font-bold tracking-tight mt-1">リスニング</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          AIの音声を聞いて、テキストで返そう。聞き取れなかったら、聞き返す一言も英語で。
        </p>
      </div>

      {errorText && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
          {errorText}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {scenarios.map((scenario) => (
          <ScenarioCard
            key={scenario.id}
            scenario={scenario}
            starting={startingId === scenario.id}
            onStart={handleStart}
          />
        ))}
      </div>
    </div>
  );
}
