"use client"

import { useTransition } from "react"
import Link from "next/link"
import { ArrowRight, TriangleAlert } from "lucide-react"
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
      <h1 className="text-xl font-semibold">設定</h1>

      <Link
        href="/settings/billing"
        className="group flex items-center justify-between rounded-4xl bg-card px-4 py-3 text-sm shadow-xs ring-1 ring-foreground/5 transition-all hover:shadow-md hover:ring-primary/30 dark:ring-foreground/10"
      >
        <span>クレジット・お支払い</span>
        <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </Link>

      <div className="flex flex-col gap-2">
        <p className="px-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          危険な操作
        </p>
        <Card className="ring-destructive/20 dark:ring-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5 text-destructive">
              <TriangleAlert className="size-4" />
              退会
            </CardTitle>
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
    </div>
  )
}
