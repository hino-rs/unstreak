export type WeakPointLike = {
  concept_key: string
  category: string
  times_flagged: number
}

// サクッとモードは語彙のみを対象とする。文法は文脈依存性が高いため
// times_flaggedが0まで下がったもの(正解して卒業した弱点)は出題プールから除外する
export function isQuickModeConcept(w: WeakPointLike): boolean {
  return w.category === "vocabulary" && w.times_flagged > 0
}
