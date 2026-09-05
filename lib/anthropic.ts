import Anthropic from "@anthropic-ai/sdk";
export const anthropic = new Anthropic();

// プロンプトキャッシュが実際に効いているかは usage.cache_read_input_tokens でしか確認できないが、
// このコードベースには usage を読む経路もログ出力も無かった。Sentry / アナリティクスを入れるまでの
// 最小の受け皿として、構造化ログを1行出す(Vercel の Functions ログで `tag":"ai_usage"` で拾える)。
// docs/マネタイズ実行計画.md P0「AI呼び出しにプロンプトキャッシングを導入する」の検証条件がこれ
export function logAiUsage(callSite: string, model: string, usage: Anthropic.Usage): void {
  console.log(
    JSON.stringify({
      tag: "ai_usage",
      callSite,
      model,
      inputTokens: usage.input_tokens,
      outputTokens: usage.output_tokens,
      cacheWriteTokens: usage.cache_creation_input_tokens ?? 0,
      cacheReadTokens: usage.cache_read_input_tokens ?? 0,
    }),
  );
}
