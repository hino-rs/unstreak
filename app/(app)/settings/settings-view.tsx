"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { updateGradeBand, deleteAccount } from "./actions"
import {
  GRADE_BANDS,
  GRADE_BAND_LABELS,
  LEVEL_LABEL_JA,
  scoreToLabel,
  type GradeBand,
} from "@/lib/level"

type SettingsViewProps = {
  gradeBand: GradeBand | null
  levelScore: number | null
  deleteError?: string | null
}

export function SettingsView({ gradeBand, levelScore, deleteError }: SettingsViewProps) {
  const [selectedGradeBand, setSelectedGradeBand] = useState<GradeBand | null>(gradeBand)
  const [saving, setSaving] = useState(false)
  const [isDeleting, startDeleteTransition] = useTransition()

  async function handleSave() {
    if (!selectedGradeBand) return
    setSaving(true)
    try {
      const { error } = await updateGradeBand(selectedGradeBand)
      if (error) throw new Error(error)
      toast.success("学年を保存しました")
    } catch {
      toast.error("保存に失敗しました")
    } finally {
      setSaving(false)
    }
  }

  function handleDeleteAccount() {
    startDeleteTransition(async () => {
      await deleteAccount()
    })
  }

  return (
    <div className="p-6 md:p-8 flex flex-col gap-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>学年</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            出題内容の目安として使います。学年を変更しても、これまでの学習実績によるレベルは変わりません。
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={selectedGradeBand ?? undefined}
              onValueChange={(value) => setSelectedGradeBand(value as GradeBand)}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="選択してください" />
              </SelectTrigger>
              <SelectContent>
                {GRADE_BANDS.map((band) => (
                  <SelectItem key={band} value={band}>
                    {GRADE_BAND_LABELS[band]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleSave} disabled={saving || !selectedGradeBand}>
              保存
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>英語レベル</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <p className="text-2xl font-semibold">{LEVEL_LABEL_JA[scoreToLabel(levelScore)]}</p>
          <p className="text-sm text-muted-foreground">
            ドリルの添削・解説結果から自動的に判定しています。使うほど精度が上がります。
          </p>
        </CardContent>
      </Card>

      <Link href="/settings/billing" className="text-sm underline text-muted-foreground hover:text-foreground">
        クレジット・お支払い
      </Link>

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-destructive">退会</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {deleteError ? (
            <p className="text-sm text-destructive">{deleteError}</p>
          ) : null}
          <p className="text-sm text-muted-foreground">
            アカウントを削除すると、学習履歴・添削結果などすべてのデータが完全に削除され、元に戻すことはできません。
          </p>
          <AlertDialog>
            <AlertDialogTrigger
              render={(props) => (
                <Button {...props} variant="destructive" className="w-fit">
                  アカウントを削除する
                </Button>
              )}
            />
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>本当に退会しますか?</AlertDialogTitle>
                <AlertDialogDescription>
                  この操作は取り消せません。学習履歴・添削結果などすべてのデータが完全に削除されます。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>キャンセル</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  disabled={isDeleting}
                  onClick={handleDeleteAccount}
                >
                  {isDeleting ? "削除中..." : "削除する"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  )
}
