"use client"

import { useTransition } from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
import { deleteAccount } from "./actions"

type SettingsViewProps = {
  deleteError?: string | null
}

export function SettingsView({ deleteError }: SettingsViewProps) {
  const [isDeleting, startDeleteTransition] = useTransition()

  function handleDeleteAccount() {
    startDeleteTransition(async () => {
      await deleteAccount()
    })
  }

  return (
    <div className="p-6 md:p-8 flex flex-col gap-6 max-w-2xl">
      <Link
        href="/settings/billing"
        className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 text-sm transition-colors hover:border-primary/40 hover:bg-accent/40"
      >
        <span>クレジット・お支払い</span>
        <ArrowRight className="size-4 text-muted-foreground" />
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
