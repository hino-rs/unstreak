"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Headphones, Loader2, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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

function OnboardingLadder({
  scenarios,
  completion,
  startingId,
  onStart,
}: {
  scenarios: ListeningScenarioCatalogItem[];
  completion: boolean[];
  startingId: string | null;
  onStart: (id: string) => void;
}) {
  const allCompleted = completion.length > 0 && completion.every(Boolean);

  if (allCompleted) {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-dashed border-border/70 bg-muted/20 px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="size-4 text-muted-foreground shrink-0" />
          <p className="text-xs text-muted-foreground">ウォームアップは完了しています</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {scenarios.map((scenario) => (
            <Button
              key={scenario.id}
              size="sm"
              variant="outline"
              disabled={startingId === scenario.id}
              onClick={() => onStart(scenario.id)}
            >
              {startingId === scenario.id && <Loader2 className="size-3.5 animate-spin" />}
              <span>{scenario.title}をもう一度</span>
            </Button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-primary/40 bg-primary/5 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="size-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">はじめての方はここから</h2>
        <Badge variant="outline" className="text-[10px] font-normal">
          無料・すぐ終わる
        </Badge>
      </div>
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-3">
        {scenarios.map((scenario, i) => {
          const done = completion[i];
          const locked = i > 0 && !completion[i - 1];
          return (
            <div key={scenario.id} className="flex flex-1 gap-2.5">
              <div className="flex flex-col items-center pt-0.5 shrink-0">
                <div
                  className={cn(
                    "size-6 rounded-full flex items-center justify-center text-[11px] font-bold border shrink-0",
                    done
                      ? "bg-primary text-primary-foreground border-primary"
                      : locked
                      ? "border-border text-muted-foreground bg-muted"
                      : "border-primary text-primary bg-primary/10"
                  )}
                >
                  {done ? <Check className="size-3.5" /> : i + 1}
                </div>
                {i < scenarios.length - 1 && (
                  <div className={cn("w-px flex-1 mt-1", done ? "bg-primary" : "bg-border")} />
                )}
              </div>
              <div className="flex-1 min-w-0 pb-1">
                <p className={cn("text-xs font-semibold", locked ? "text-muted-foreground" : "text-foreground")}>
                  {scenario.title}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                  {scenario.situationBrief}
                </p>
                <Button
                  size="sm"
                  variant={locked ? "outline" : "default"}
                  className="mt-2 gap-1.5"
                  disabled={locked || startingId === scenario.id}
                  onClick={() => onStart(scenario.id)}
                >
                  {startingId === scenario.id && <Loader2 className="size-3.5 animate-spin" />}
                  <span>{locked ? "前のステップを完了すると解放" : done ? "もう一度やる" : "はじめる"}</span>
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ListeningCatalogView({
  onboardingScenarios,
  onboardingCompletion,
  tierScenarios,
}: {
  onboardingScenarios: ListeningScenarioCatalogItem[];
  onboardingCompletion: boolean[];
  tierScenarios: ListeningScenarioCatalogItem[];
}) {
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

      {onboardingScenarios.length > 0 && (
        <OnboardingLadder
          scenarios={onboardingScenarios}
          completion={onboardingCompletion}
          startingId={startingId}
          onStart={handleStart}
        />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tierScenarios.map((scenario) => (
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
