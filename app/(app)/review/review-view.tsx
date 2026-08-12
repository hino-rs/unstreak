"use client"

import { useMemo, useTransition } from "react"
import { useRouter } from "next/navigation"
import { RefreshCw, Sparkles, Target, AlertTriangle, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export type WeakPointLabel =
  | "冠詞"
  | "過去形"
  | "現在完了形"
  | "前置詞"
  | "単複の一致"
  | "主語と動詞の一致"
  | "語順"
  | "比較表現"
  | "仮定法・条件分"
  | "助動詞"
  | "受動態"
  | "その他文法"
  | "単語・熟語等";

export interface WeakPoint {
  category: string;
  display_label: string | null;
  times_flagged: number;
  last_seen_at: string;
}

const LABEL_DETAILS: Record<
  string,
  { description: string; tip: string }
> = {
  "冠詞": {
    description: "a / an / the の使い分けや可算・不可算の認識",
    tip: "名詞を使う際は特定か不特定かを常に意識しましょう",
  },
  "過去形": {
    description: "不規則動詞の活用や過去時制の一貫性",
    tip: "過去の出来事を話す際は時制の一致を確認しましょう",
  },
  "現在完了形": {
    description: "have + 過去分詞（継続・経験・完了）の用法",
    tip: "「今とのつながり」があるかどうかを見極めましょう",
  },
  "前置詞": {
    description: "in / on / at / for などの適切な選択",
    tip: "単語単体ではなくフレーズ（コロケーション）で覚えましょう",
  },
  "単複の一致": {
    description: "名詞の単数・複数形と冠詞の整合性",
    tip: "複数形の -s 付け忘れや不可算名詞に注意しましょう",
  },
  "主語と動詞の一致": {
    description: "三人称単数現在（三単現の -s）や主語と動詞の呼応",
    tip: "主語を特定し、動詞の形が合っているかチェックしましょう",
  },
  "語順": {
    description: "修飾語の位置や SVO / SVOO 等の基本語順",
    tip: "英語は「誰が・どうする・何を」の語順が基本です",
  },
  "比較表現": {
    description: "er / more や than、as...as の構文",
    tip: "比較対象が文法的に同等かを確認しましょう",
  },
  "仮定法・条件分": {
    description: "If 節と帰結節の時制(would / could など)",
    tip: "事実と異なる仮定では時制を1つ過去にずらします",
  },
  "助動詞": {
    description: "can / should / must / will などのニュアンスと用法",
    tip: "助動詞の後の動詞は原形になることを徹底しましょう",
  },
  "受動態": {
    description: "be + 過去分詞の形と受動の表現",
    tip: "動作主(by 〜)と主語の関係を意識しましょう",
  },
  "その他文法": {
    description: "接続詞や関係代名詞などの文法事項",
    tip: "文章の構造をシンプルに保つことから始めましょう",
  },
  "単語・熟語等": {
    description: "文脈に即した語彙・イディオムの適切な選択",
    tip: "文脈に合った自然な語彙表現を増やしていきましょう",
  },
};

type CardSize = "large" | "medium" | "small";

function getCardSize(count: number, maxCount: number, rank: number): CardSize {
  const ratio = maxCount > 0 ? count / maxCount : 0;
  // 最多または比率75%以上かつ上位2位以内は大サイズ
  if (ratio >= 0.75 || (rank === 0 && count > 0)) {
    return "large";
  }
  // 比率40%以上は中サイズ
  if (ratio >= 0.4) {
    return "medium";
  }
  return "small";
}

interface ReviewViewProps {
  initialWeakPoints: WeakPoint[];
}

export function ReviewView({ initialWeakPoints }: ReviewViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleRefresh = () => {
    startTransition(() => {
      router.refresh();
    });
  };

  const weakPointLabelMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const w of initialWeakPoints) {
      const key = w.display_label ?? "その他文法";
      if (w.category === "grammar") {
        map.set(key, (map.get(key) ?? 0) + w.times_flagged);
      } else {
        map.set("単語・熟語等", (map.get("単語・熟語等") ?? 0) + w.times_flagged);
      }
    }
    return map;
  }, [initialWeakPoints]);

  const sortedEntries = useMemo(() => {
    return Array.from(weakPointLabelMap.entries()).sort((a, b) => b[1] - a[1]);
  }, [weakPointLabelMap]);

  const { totalCount, maxCount, topLabel } = useMemo(() => {
    let total = 0;
    let max = 0;
    let top: string | null = null;
    for (const [label, count] of sortedEntries) {
      total += count;
      if (count > max) {
        max = count;
        top = label;
      }
    }
    return { totalCount: total, maxCount: max, topLabel: top };
  }, [sortedEntries]);

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* ページヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">Analysis & Review</span>
            <Badge variant="secondary" className="text-[11px] font-normal">
              AI弱点分析
            </Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight mt-1">弱点フォーカス・振り返り</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            過去のドリルでAIが検出したミスの傾向と比率を可視化しています
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isPending}
          className="self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isPending ? "animate-spin" : ""}`} />
          更新
        </Button>
      </div>

      {/* サマリー指標（KPI） */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border/60 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
            <span>総指摘回数</span>
            <Target className="w-4 h-4 text-primary" />
          </div>
          <div className="mt-2 text-2xl font-extrabold tracking-tight">
            {totalCount} <span className="text-sm font-normal text-muted-foreground">回</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">ドリル全体で検出された改善ポイント</p>
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
            <span>最頻出の弱点</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-extrabold tracking-tight truncate text-amber-600 dark:text-amber-400">
            {topLabel ? topLabel : "なし"}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {maxCount > 0 ? `全体の ${Math.round((maxCount / (totalCount || 1)) * 100)}% を占めています` : "データ蓄積中"}
          </p>
        </div>
      </div>

      {/* Bento Grid 表示エリア */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold tracking-tight">弱点比率マップ (Bento Grid)</h2>
          <span className="text-xs text-muted-foreground">出現比率に応じてサイズが自動調整されます</span>
        </div>

        {/* データなし（Empty State） */}
        {sortedEntries.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-12 text-center flex flex-col items-center justify-center bg-card/40">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold">弱点データはまだありません</h3>
            <p className="text-sm text-muted-foreground max-w-sm mt-1">
              画像説明ドリルや日記の添削を受けると、AIが自動であなたの弱点傾向をここにまとめます。
            </p>
          </div>
        )}

        {/* Bento Grid コンテンツ */}
        {sortedEntries.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 auto-rows-40 grid-flow-dense">
            {sortedEntries.map(([label, count], index) => {
              const cardSize = getCardSize(count, maxCount, index);
              const percentage = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
              const details = LABEL_DETAILS[label] ?? {
                description: "AIによるフィードバック項目",
                tip: "基礎をしっかり復習しましょう",
              };

              // 大サイズカード (2列 x 2行)
              if (cardSize === "large") {
                return (
                  <div
                    key={label}
                    className="col-span-1 sm:col-span-2 md:col-span-2 row-span-2 rounded-2xl border border-primary/20 bg-linear-to-br from-card via-card to-primary/5 p-6 shadow-sm hover:border-primary/50 hover:shadow-md transition-all flex flex-col justify-between group relative overflow-hidden"
                  >
                    {/* 上部アクセントバー */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-primary to-violet-500" />

                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <Badge variant="secondary" className="text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20">
                            ★ 最多指摘
                          </Badge>
                        </div>
                        <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                          全体の {percentage}%
                        </span>
                      </div>

                      <h3 className="text-xl font-bold mt-3 group-hover:text-primary transition-colors">
                        {label}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        {details.description}
                      </p>
                    </div>

                    <div className="space-y-3 pt-2">
                      {/* AIアドバイスのTip枠 */}
                      <div className="rounded-xl bg-muted/50 p-3 border border-border/50 text-xs">
                        <div className="flex items-center gap-1.5 font-medium text-foreground mb-1">
                          <Sparkles className="w-3.5 h-3.5 text-primary" />
                          <span>重点対策ポイント</span>
                        </div>
                        <p className="text-muted-foreground">{details.tip}</p>
                      </div>

                      {/* 指摘回数 */}
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-muted-foreground">指摘頻度</span>
                        <span className="font-bold text-foreground">
                          <span className="text-lg text-primary">{count}</span> 回
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }

              // 中サイズカード (2列 x 1行)
              if (cardSize === "medium") {
                return (
                  <div
                    key={label}
                    className="col-span-1 sm:col-span-2 md:col-span-2 row-span-1 rounded-2xl border border-border/60 bg-card p-5 shadow-xs hover:border-primary/40 hover:shadow-sm transition-all flex flex-col justify-between group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-muted-foreground">比率 {percentage}%</span>
                        </div>
                        <h3 className="text-base font-bold mt-1 group-hover:text-primary transition-colors">
                          {label}
                        </h3>
                      </div>
                      <div className="text-right">
                        <span className="text-xl font-bold tracking-tight text-foreground">{count}</span>
                        <span className="text-xs text-muted-foreground ml-0.5">回</span>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground truncate mb-2">{details.tip}</p>
                    </div>
                  </div>
                );
              }

              // 小サイズカード (1列 x 1行)
              return (
                <div
                  key={label}
                  className="col-span-1 row-span-1 rounded-2xl border border-border/60 bg-card p-4 shadow-xs hover:border-primary/40 hover:shadow-sm transition-all flex flex-col justify-between group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-muted-foreground">{percentage}%</span>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
                      {label}
                    </h4>
                  </div>

                  <div className="flex items-end justify-between border-t border-border/40 pt-2">
                    <span className="text-[11px] text-muted-foreground">指摘回数</span>
                    <span className="text-sm font-bold text-foreground">
                      {count} <span className="text-[11px] font-normal text-muted-foreground">回</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
