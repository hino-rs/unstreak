"use client"

import { useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { ArrowRight } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { updateGradeBand, updateTopicProfile } from "@/app/(app)/settings/actions"
import { MAX_HOBBIES_LENGTH, MAX_OCCUPATION_LENGTH } from "@/lib/topic"
import {
  GRADE_BANDS,
  GRADE_BAND_LABELS,
  LEVEL_LABEL_JA,
  scoreToLabel,
  type GradeBand,
} from "@/lib/level"

type ProfileViewProps = {
  email: string
  createdAt: string
  gradeBand: GradeBand | null
  levelScore: number | null
  occupation: string | null
  hobbies: string | null
}

export function ProfileView({
  email,
  createdAt,
  gradeBand,
  levelScore,
  occupation,
  hobbies,
}: ProfileViewProps) {
  const [selectedGradeBand, setSelectedGradeBand] = useState<GradeBand | null>(gradeBand)
  const [saving, setSaving] = useState(false)
  const [occupationValue, setOccupationValue] = useState(occupation ?? "")
  const [hobbiesValue, setHobbiesValue] = useState(hobbies ?? "")
  const [savingTopicProfile, setSavingTopicProfile] = useState(false)

  const initials = email.slice(0, 2).toUpperCase() || "CN"
  const joinedLabel = createdAt
    ? new Date(createdAt).toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" })
    : null

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

  async function handleSaveTopicProfile() {
    setSavingTopicProfile(true)
    try {
      const { error } = await updateTopicProfile(occupationValue, hobbiesValue)
      if (error) throw new Error(error)
      toast.success("職業・趣味を保存しました")
    } catch {
      toast.error("保存に失敗しました")
    } finally {
      setSavingTopicProfile(false)
    }
  }

  return (
    <div className="p-6 md:p-8 flex flex-col gap-6 max-w-2xl">
      <h1 className="text-xl font-semibold">プロフィール</h1>

      <div className="flex items-center gap-4">
        <Avatar className="size-16">
          <AvatarFallback className="text-lg">{initials}</AvatarFallback>
        </Avatar>
        <div>
          <p className="text-lg font-semibold">{email}</p>
          {joinedLabel && (
            <p className="text-sm text-muted-foreground">{joinedLabel} 登録</p>
          )}
        </div>
      </div>

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
              {saving ? "保存中..." : "保存"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>職業・趣味</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            トピック説明でAIがあなたに合わせた話題を出すために使います。両方とも設定するとトピック説明を始められます。
          </p>
          <div className="flex flex-col gap-2">
            <Label htmlFor="occupation">職業</Label>
            <Input
              id="occupation"
              value={occupationValue}
              onChange={(e) => setOccupationValue(e.target.value)}
              placeholder="未設定（例：ソフトウェアエンジニア）"
              maxLength={MAX_OCCUPATION_LENGTH}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="hobbies">趣味</Label>
            <Textarea
              id="hobbies"
              value={hobbiesValue}
              onChange={(e) => setHobbiesValue(e.target.value)}
              placeholder="未設定（例：登山, 写真, ゲーム）"
              maxLength={MAX_HOBBIES_LENGTH}
              rows={2}
            />
            <p className="text-xs text-muted-foreground">
              カンマ区切りで複数書けます。具体的なほど話題が広がります。
            </p>
          </div>
          <div>
            <Button onClick={handleSaveTopicProfile} disabled={savingTopicProfile}>
              {savingTopicProfile ? "保存中..." : "保存"}
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

      <Link
        href="/settings"
        className="group flex items-center justify-between rounded-4xl bg-card px-4 py-3 text-sm shadow-xs ring-1 ring-foreground/5 transition-all hover:shadow-md hover:ring-primary/30 dark:ring-foreground/10"
      >
        <span>アカウント設定（お支払い・退会）</span>
        <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </Link>
    </div>
  )
}
