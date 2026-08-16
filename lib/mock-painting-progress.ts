// 絵画ドリルUIモック用の進捗保存。実DBは未実装のため localStorage で代用している。

const STORAGE_KEY = "unstreak_mock_painting_progress"

export function getCompletedSlugs(): string[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function markSlugCompleted(slug: string) {
  if (typeof window === "undefined") return
  const current = new Set(getCompletedSlugs())
  current.add(slug)
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...current]))
}
