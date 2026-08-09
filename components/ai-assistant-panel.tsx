"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Send,
  CheckCircle2,
  XCircle,
  HelpCircle,
  RefreshCw,
  AlertCircle,
  BookOpen,
  ArrowRight,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { Ai2Response } from "@/lib/ai2";

interface HistoryItem {
  id: string;
  question: string;
  userGuess: string | null;
  answer: string;
  vocabLemma: string;
  wasGuessCorrect: boolean | null;
  explanation: string;
  createdAt: Date;
}

export function AiAssistantPanel() {
  const [question, setQuestion] = useState("");
  const [guess, setGuess] = useState("");
  const [isSkip, setIsSkip] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [response, setResponse] = useState<Ai2Response | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedQuestion = question.trim();
    const trimmedGuess = guess.trim();

    if (!trimmedQuestion || isLoading) return;
    if (!isSkip && !trimmedGuess) return;

    setIsLoading(true);
    setErrorText(null);

    const payload = isSkip
      ? { mode: "skip" as const, question: trimmedQuestion }
      : { mode: "answer" as const, question: trimmedQuestion, guess: trimmedGuess };

    try {
      const res = await fetch("/api/question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error("質問の送信に失敗しました");
      }

      const data: Ai2Response = await res.json();
      setResponse(data);

      if (data.status === "revealed") {
        const newItem: HistoryItem = {
          id: Math.random().toString(36).substring(2, 9),
          question: trimmedQuestion,
          userGuess: isSkip ? null : trimmedGuess,
          answer: data.answer,
          vocabLemma: data.vocab_lemma,
          wasGuessCorrect: data.was_guess_correct,
          explanation: data.explanation,
          createdAt: new Date(),
        };
        setHistory((prev) => [newItem, ...prev.slice(0, 9)]);
      }
    } catch (err: any) {
      console.error("[AiAssistantPanel] submit error:", err);
      setErrorText(err.message || "エラーが発生しました。もう一度お試しください。");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setQuestion("");
    setGuess("");
    setIsSkip(false);
    setResponse(null);
    setErrorText(null);
  };

  return (
    <div className="flex flex-col h-full w-full max-w-sm mx-auto text-left gap-4">
      {/* ヘッダー */}
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-violet-100 flex items-center justify-center text-violet-600">
            <Sparkles className="size-4" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-foreground">AI2 辞書相棒</h3>
            <p className="text-[11px] text-muted-foreground">単語・熟語をすぐ確認</p>
          </div>
        </div>
        {response && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className="size-3.5 mr-1" />
            新しい質問
          </Button>
        )}
      </div>

      {/* エラー表示 */}
      {errorText && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
          <AlertCircle className="size-4 shrink-0 mt-0.5" />
          <div className="flex-1">{errorText}</div>
        </div>
      )}

      {/* 応答カード表示 */}
      {response ? (
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {response.status === "revealed" && (
            <div className="bg-card border border-border rounded-xl p-4 space-y-4 shadow-xs">
              {/* 正誤判定バッジ */}
              <div className="flex items-center justify-between">
                {response.was_guess_correct === true ? (
                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100 gap-1.5 py-1 px-2.5">
                    <CheckCircle2 className="size-3.5 text-emerald-600" />
                    正解！
                  </Badge>
                ) : response.was_guess_correct === false ? (
                  <Badge className="bg-rose-100 text-rose-800 border-rose-200 hover:bg-rose-100 gap-1.5 py-1 px-2.5">
                    <XCircle className="size-3.5 text-rose-600" />
                    惜しい / 不正解
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="gap-1.5 py-1 px-2.5 text-muted-foreground">
                    <HelpCircle className="size-3.5 text-muted-foreground" />
                    回答
                  </Badge>
                )}

                <span className="text-[11px] font-mono text-muted-foreground">
                  lemma: {response.vocab_lemma}
                </span>
              </div>

              {/* 英語表現の強調表示 */}
              <div className="p-3 bg-violet-50/70 border border-violet-100 rounded-lg">
                <div className="text-xs text-violet-600 font-medium mb-0.5">英語表現</div>
                <div className="text-lg font-bold text-violet-950 tracking-wide">
                  {response.answer}
                </div>
              </div>

              {/* ユーザーの予想との対比 */}
              {response.user_guess && (
                <div className="text-xs space-y-1 bg-muted/40 p-2.5 rounded-lg border border-border">
                  <span className="text-muted-foreground block">あなたの予想:</span>
                  <div className="flex items-center gap-2 font-medium">
                    <span
                      className={
                        response.was_guess_correct
                          ? "text-emerald-700"
                          : "text-rose-700 line-through"
                      }
                    >
                      {response.user_guess}
                    </span>
                    {!response.was_guess_correct && (
                      <>
                        <ArrowRight className="size-3 text-muted-foreground" />
                        <span className="text-emerald-700">{response.answer}</span>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* 解説 */}
              <div className="space-y-1">
                <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <BookOpen className="size-3.5" />
                  解説・ワンポイント
                </div>
                <p className="text-xs text-foreground/90 leading-relaxed bg-muted/20 p-2.5 rounded-lg border border-border/60">
                  {response.explanation}
                </p>
              </div>

              <Button onClick={handleReset} className="w-full bg-violet-600 hover:bg-violet-700 text-white text-xs h-9">
                <RefreshCw className="size-3.5 mr-1.5" />
                別の単語を質問する
              </Button>
            </div>
          )}

          {response.status === "out_of_scope" && (
            <div className="bg-card border border-amber-200/80 rounded-xl p-4 space-y-3 shadow-xs">
              <div className="flex items-center gap-2 text-amber-700 text-sm font-semibold">
                <AlertCircle className="size-4" />
                AI2の対象外の質問です
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                AI2は単語や短い熟語の想起に特化した相棒です。
              </p>
              <div className="p-3 bg-amber-50 rounded-lg text-xs text-amber-900 leading-relaxed border border-amber-200">
                {response.message}
              </div>
              <Button
                variant="outline"
                onClick={handleReset}
                className="w-full text-xs h-9"
              >
                別の質問をする
              </Button>
            </div>
          )}

          {response.status === "guess_required" && (
            <div className="bg-card border border-border rounded-xl p-4 space-y-3 shadow-xs">
              <div className="text-xs font-semibold text-violet-700">
                まずは予想してみましょう！
              </div>
              <p className="text-xs text-muted-foreground">
                「{response.normalized_question}」の英語表現を一度予想してみてください。
              </p>
              <form onSubmit={handleSubmit} className="space-y-3">
                <Input
                  type="text"
                  placeholder="予想を入力（例: Desert）"
                  value={guess}
                  onChange={(e) => setGuess(e.target.value)}
                  disabled={isLoading}
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => {
                      setIsSkip(true);
                      handleSubmit({ preventDefault: () => {} } as any);
                    }}
                    disabled={isLoading}
                  >
                    わからない（答えを見る）
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    className="flex-1 bg-violet-600 hover:bg-violet-700 text-white text-xs"
                    disabled={isLoading || !guess.trim()}
                  >
                    {isLoading ? <Loader2 className="size-3.5 animate-spin" /> : "送信"}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </div>
      ) : (
        /* 入力フォーム（初期画面） */
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 flex-1">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span>質問（日本語または英語）</span>
              <span className="text-[10px] text-muted-foreground font-normal">必須</span>
            </label>
            <Textarea
              required
              rows={2}
              placeholder="例: 「砂漠」って英語で何て言う？"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              disabled={isLoading}
              className="text-xs resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground">あなたの予想</label>
              <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-muted-foreground hover:text-foreground select-none">
                <input
                  type="checkbox"
                  checked={isSkip}
                  onChange={(e) => {
                    setIsSkip(e.target.checked);
                    if (e.target.checked) setGuess("");
                  }}
                  className="rounded border-border text-violet-600 focus:ring-violet-500 size-3.5"
                />
                わからない（スキップ）
              </label>
            </div>
            <Input
              type="text"
              required={!isSkip}
              placeholder={isSkip ? "スキップが選択されています" : "例: Desert (当てずっぽうでもOK)"}
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              disabled={isLoading || isSkip}
              className="text-xs"
            />
          </div>

          <Button
            type="submit"
            disabled={isLoading || !question.trim() || (!isSkip && !guess.trim())}
            className="w-full bg-violet-600 hover:bg-violet-700 text-white text-xs h-9 mt-1"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="size-3.5 animate-spin" />
                AI2が確認中...
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <Send className="size-3.5" />
                質問する
              </span>
            )}
          </Button>

          <p className="text-[11px] text-muted-foreground leading-tight text-center mt-auto pb-1">
            💡 間違えても予想を一度挟むことで、記憶の定着率が高まります。
          </p>
        </form>
      )}

      {/* 履歴アコーディオン */}
      {history.length > 0 && (
        <div className="pt-2 border-t border-border mt-auto">
          <button
            type="button"
            onClick={() => setShowHistory(!showHistory)}
            className="w-full flex items-center justify-between text-xs text-muted-foreground hover:text-foreground py-1 font-medium select-none"
          >
            <span>最近の質問 ({history.length}件)</span>
            {showHistory ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
          </button>

          {showHistory && (
            <div className="mt-2 space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="p-2 rounded-lg bg-muted/40 border border-border/70 text-xs flex items-center justify-between gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-foreground truncate">{item.answer}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{item.question}</div>
                  </div>
                  {item.wasGuessCorrect === true ? (
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 shrink-0 font-medium">
                      正解
                    </span>
                  ) : item.wasGuessCorrect === false ? (
                    <span className="text-[10px] text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 shrink-0 font-medium">
                      不正解
                    </span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground bg-gray-100 px-1.5 py-0.5 rounded shrink-0">
                      スキップ
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
