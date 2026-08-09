export default function DashboardPage() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 auto-rows-45">
      {/* 1. メイン: 弱点マップ（大きく目立たせる: 2列 x 2行） */}
      <div className="md:col-span-2 md:row-span-2 rounded-2xl border border-border/60 bg-card p-6 shadow-sm flex flex-col justify-between hover:border-primary/40 transition-colors">
        <div>
          <span className="text-xs font-semibold text-primary uppercase tracking-wider">Analysis</span>
          <h3 className="text-lg font-bold mt-1">弱点フォーカスマップ</h3>
          <p className="text-sm text-muted-foreground">直近のストリーク中断要因をヒートマップで可視化</p>
        </div>
        <div className="h-48 rounded-xl bg-muted/40 flex items-center justify-center text-muted-foreground text-sm">
          {/* ここにマップやチャート */}
          弱点マップチャート表示エリア
        </div>
      </div>

      {/* 2. サブ1: 今日のスコア / 重要指標（1列 x 1行） */}
      <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm hover:border-primary/40 transition-colors">
        <span className="text-xs font-medium text-muted-foreground">今日の回復率</span>
        <div className="mt-2 text-3xl font-extrabold tracking-tight">92.4%</div>
        <p className="text-xs text-emerald-500 mt-1 font-medium">↑ 前週比 +8.2%</p>
      </div>

      {/* 3. サブ2: ストリーク状況（1列 x 1行） */}
      <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm hover:border-primary/40 transition-colors">
        <span className="text-xs font-medium text-muted-foreground">現在ストリーク</span>
        <div className="mt-2 text-3xl font-extrabold tracking-tight">14 日</div>
        <p className="text-xs text-muted-foreground mt-1">自己ベストまであと 3日</p>
      </div>

      {/* 4. 横長カード: 直近の傾向・アドバイス（2列 x 1行） */}
      <div className="md:col-span-2 rounded-2xl border border-border/60 bg-card p-5 shadow-sm hover:border-primary/40 transition-colors flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold">AI アナライザーの推奨アクション</h4>
          <p className="text-xs text-muted-foreground mt-1">木曜夜の離脱率が高めです。リマインド時間を30分早めることを推奨します。</p>
        </div>
      </div>

      {/* 5. 縦長カード: リスト・履歴（1列 x 2行 など） */}
      {/* ... */}
    </div>
  );
}
