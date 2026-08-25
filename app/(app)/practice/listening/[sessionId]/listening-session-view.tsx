"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Loader2, Sparkles, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { BubbleGroup, Bubble, BubbleContent } from "@/components/ui/bubble";
import { cn } from "@/lib/utils";

type TurnType = "utterance" | "user_reply" | "clarification_request" | "ai_clarification_response";

type Turn = {
  id: string;
  role: "ai" | "user";
  turnType: TurnType;
  content: string;
  clarificationStrategy: "repeat" | "rephrase" | "slow_down" | null;
  audioRate?: number;
};

type ScenarioInfo = {
  title: string;
  situationBrief: string;
  voiceAccent: string;
  baseRate: number;
  isOnboarding: boolean;
};

type SessionSummary = {
  turnCount: number;
  clarificationCount: number;
  clarificationRate: number;
  transcriptRevealed: boolean;
};

const CLARIFICATION_TEMPLATES = [
  "Could you say that again?",
  "Sorry, what does that mean?",
  "Could you speak a bit more slowly?",
];

async function fetchTurnAudioUrl(text: string, rate: number): Promise<string> {
  const res = await fetch("/api/listening/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, rate }),
  });
  if (!res.ok) {
    throw new Error(`tts request failed: ${res.status}`);
  }
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

export function ListeningSessionView({
  sessionId,
  status,
  scenario,
  initialTurns,
  initialRevealAllowed,
  transcriptRevealed,
}: {
  sessionId: string;
  status: "active" | "completed";
  scenario: ScenarioInfo;
  initialTurns: Turn[];
  initialRevealAllowed: boolean;
  transcriptRevealed: boolean;
}) {
  const router = useRouter();
  const [turns, setTurns] = useState<Turn[]>(initialTurns);
  const [text, setText] = useState("");
  const [clarificationMode, setClarificationMode] = useState(false);
  const [sending, setSending] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [revealAllowed, setRevealAllowed] = useState(initialRevealAllowed);
  const [revealed, setRevealed] = useState(transcriptRevealed);
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(status === "completed");
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [loadingAudioTurnId, setLoadingAudioTurnId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const audioCacheRef = useRef<Map<string, string>>(new Map());
  const localIdCounterRef = useRef(0);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns]);

  useEffect(() => {
    audioElRef.current = new Audio();
    const cache = audioCacheRef.current;
    return () => {
      cache.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const playTurn = async (turn: Turn) => {
    if (!audioElRef.current) return;
    try {
      let url = audioCacheRef.current.get(turn.id);
      if (!url) {
        setLoadingAudioTurnId(turn.id);
        url = await fetchTurnAudioUrl(turn.content, turn.audioRate ?? scenario.baseRate);
        audioCacheRef.current.set(turn.id, url);
      }
      audioElRef.current.src = url;
      await audioElRef.current.play();
    } catch {
      setErrorText("音声の再生に失敗しました。もう一度お試しください。");
    } finally {
      setLoadingAudioTurnId(null);
    }
  };

  const handleStart = () => {
    setStarted(true);
    const lastAi = [...turns].reverse().find((t) => t.role === "ai");
    if (lastAi) playTurn(lastAi);
  };

  const submitTurn = async () => {
    if (!text.trim() || sending || done) return;
    setSending(true);
    setErrorText(null);
    const wasClarification = clarificationMode;
    try {
      const res = await fetch(`/api/listening/sessions/${sessionId}/turns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: wasClarification ? "clarification" : "reply", text }),
      });
      if (!res.ok) {
        if (res.status === 402) {
          setErrorText("クレジットが不足しています。設定画面から追加してください。");
        } else if (res.status === 429) {
          setErrorText("しばらく時間をおいてから再度お試しください。");
        } else {
          setErrorText("送信中にエラーが発生しました。もう一度お試しください。");
        }
        return;
      }
      const data = await res.json();

      localIdCounterRef.current += 1;
      const userTurn: Turn = {
        id: `local-${localIdCounterRef.current}`,
        role: "user",
        turnType: wasClarification ? "clarification_request" : "user_reply",
        content: text,
        clarificationStrategy: null,
      };
      setText("");
      setClarificationMode(false);

      if (data.turnCapReached) {
        setTurns((prev) => [...prev, userTurn]);
        setErrorText("会話のターン数の上限に達しました。「会話を終える」から締めくくりましょう。");
        return;
      }

      const aiTurn: Turn = {
        id: data.turn.id,
        role: "ai",
        turnType: data.turn.turnType,
        content: data.turn.content,
        clarificationStrategy: data.turn.clarificationStrategy ?? null,
        audioRate: data.turn.audioRate,
      };
      setTurns((prev) => [...prev, userTurn, aiTurn]);
      setRevealAllowed(data.revealAllowed);
      playTurn(aiTurn);
    } catch {
      setErrorText("通信エラーが発生しました。もう一度お試しください。");
    } finally {
      setSending(false);
    }
  };

  const revealTranscript = async () => {
    try {
      const res = await fetch(`/api/listening/sessions/${sessionId}/reveal-transcript`, { method: "POST" });
      if (res.ok) setRevealed(true);
    } catch {
      // 失敗しても致命的ではないので静かに無視
    }
  };

  const finishSession = async () => {
    if (sending) return;
    setSending(true);
    setErrorText(null);
    try {
      const res = await fetch(`/api/listening/sessions/${sessionId}/complete`, { method: "POST" });
      if (!res.ok) {
        setErrorText("会話の終了処理に失敗しました。もう一度お試しください。");
        return;
      }
      const data: { summary: SessionSummary } = await res.json();
      setSummary(data.summary);
      setDone(true);
    } catch {
      setErrorText("通信エラーが発生しました。もう一度お試しください。");
    } finally {
      setSending(false);
    }
  };

  if (done) {
    return (
      <div className="p-4 sm:p-6 md:p-8 mx-auto w-full max-w-2xl">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 dark:bg-emerald-950/20 dark:border-emerald-800/50 p-8 flex flex-col items-center text-center gap-3">
          <div className="size-12 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="size-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">会話を終えました</h2>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              「{scenario.title}」を{summary?.turnCount ?? turns.length}ターン練習しました。
              {summary && summary.clarificationCount > 0
                ? `聞き返しは${summary.clarificationCount}回。とっさの一言で会話を止めずに続けられました。`
                : "聞き返しなしで最後まで会話が続きました。"}
            </p>
          </div>
          <Button onClick={() => router.push("/practice/listening")} className="gap-1.5 mt-1">
            <ArrowLeft className="size-3.5" />
            <span>一覧へ戻る</span>
          </Button>
        </div>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="p-4 sm:p-6 md:p-8 mx-auto w-full max-w-2xl space-y-5">
        <Link
          href="/practice/listening"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          一覧へ戻る
        </Link>
        <div className="rounded-2xl border border-border/60 bg-card p-6 space-y-4 text-center">
          <h1 className="text-lg font-bold text-foreground">{scenario.title}</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">{scenario.situationBrief}</p>
          {scenario.isOnboarding ? (
            <div className="rounded-xl bg-muted/40 p-3 text-left space-y-1.5">
              <p className="text-xs text-foreground leading-relaxed">
                これは足慣らしです。まず音声が流れるので、聞こえた範囲で英語で返信してみましょう。
              </p>
              <p className="text-xs text-foreground leading-relaxed">
                もし聞き取れなかったら、下にある「聞き取れなかった？」を押すと、聞き返す一言を英語で書けます
                （&ldquo;Could you say that again?&rdquo; など）。書くとAIが繰り返したり、言い換えたりしてくれます。
              </p>
              <p className="text-[11px] text-muted-foreground">
                このシナリオはクレジットを消費しません。何度でも試せます。
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground/80">
              音声が流れます。聞き取れなかったら、聞き返す一言も英語で入力しましょう。
            </p>
          )}
          <Button onClick={handleStart} className="gap-1.5">
            <Volume2 className="size-3.5" />
            <span>はじめる</span>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 mx-auto w-full max-w-2xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/practice/listening"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          一覧へ戻る
        </Link>
        <Badge variant="outline" className="text-[10px] font-normal">
          {scenario.title}
        </Badge>
      </div>

      <div
        ref={scrollRef}
        className="max-h-[55vh] overflow-y-auto rounded-2xl border border-border/60 bg-muted/20 p-4"
      >
        <BubbleGroup>
          {turns.map((turn) => {
            const isLoadingAudio = loadingAudioTurnId === turn.id;
            return (
              <Bubble key={turn.id} align={turn.role === "ai" ? "start" : "end"}>
                <BubbleContent>
                  {turn.role === "ai" && !revealed ? (
                    <button
                      type="button"
                      onClick={() => playTurn(turn)}
                      disabled={isLoadingAudio}
                      className="inline-flex items-center gap-1.5"
                    >
                      {isLoadingAudio ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Volume2 className="size-3.5" />
                      )}
                      <span>音声を再生</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <span>{turn.content}</span>
                      {turn.role === "ai" && (
                        <button
                          type="button"
                          onClick={() => playTurn(turn)}
                          disabled={isLoadingAudio}
                          className="shrink-0 text-muted-foreground hover:text-foreground"
                        >
                          {isLoadingAudio ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Volume2 className="size-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  )}
                </BubbleContent>
              </Bubble>
            );
          })}
        </BubbleGroup>
      </div>

      {errorText && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
          {errorText}
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setClarificationMode((v) => !v)}
            className={cn(
              "text-xs font-medium rounded-full px-3 py-1 border transition-colors",
              clarificationMode
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            )}
          >
            聞き取れなかった？
          </button>
          {revealAllowed && !revealed && (
            <button
              type="button"
              onClick={revealTranscript}
              className="text-xs text-muted-foreground underline hover:text-foreground"
            >
              書き起こしを見る
            </button>
          )}
        </div>

        {clarificationMode && (
          <div className="flex flex-wrap gap-1.5">
            {CLARIFICATION_TEMPLATES.map((template) => (
              <button
                key={template}
                type="button"
                onClick={() => setText(template)}
                className="text-[11px] rounded-full border border-border px-2.5 py-1 text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
              >
                {template}
              </button>
            ))}
          </div>
        )}

        <Textarea
          rows={2}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={clarificationMode ? "Could you say that again?" : "Type your reply in English..."}
          className="text-sm leading-relaxed"
        />

        <div className="flex items-center gap-2">
          <Button onClick={submitTurn} disabled={!text.trim() || sending} className="flex-1 gap-1.5">
            {sending ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
            <span>{clarificationMode ? "聞き返す" : "送信する"}</span>
          </Button>
          <Button variant="outline" onClick={finishSession} disabled={sending}>
            会話を終える
          </Button>
        </div>
      </div>
    </div>
  );
}
