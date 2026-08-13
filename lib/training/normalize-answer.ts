// 特訓(サクッと)の機械的採点用の正規化。
// 記事の有無・内部句読点・表記ゆれの許容はせず、完全一致比較のみを行う
export function normalizeAnswer(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[.,!?;:]+$/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

// AI2はrevealed_answerに"toward me / towards me"のように表記ゆれをまとめて
// 1文字列で返すことがある。区切り文字("/", ",", "、", 単独の"or")で分割し、
// 列挙された候補のどれか1つに一致すれば正解として扱う。
export function splitAnswerVariants(expected: string): string[] {
  return expected
    .split(/\s*(?:\/|,|、|\bor\b)\s*/i)
    .map((v) => v.trim())
    .filter((v) => v.length > 0)
}

export function isAcceptableAnswer(answer: string, expected: string): boolean {
  const normalizedAnswer = normalizeAnswer(answer)
  return splitAnswerVariants(expected).some((variant) => normalizeAnswer(variant) === normalizedAnswer)
}
