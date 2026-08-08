"use client"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import Image from "next/image"
import { AspectRatio } from "@/components/ui/aspect-ratio"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Bubble, BubbleContent } from "@/components/ui/bubble"
import { Message, MessageAvatar, MessageContent } from "@/components/ui/message"
import { Separator } from "@/components/ui/separator"
import React, { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"

interface ResultModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  feedback: string | null
}

function ResultModal({ open, onOpenChange, feedback }: ResultModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>採点結果</DialogTitle>
          <DialogDescription>
            AIによる採点とフィードバック
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 text-sm whitespace-pre-wrap">
          {feedback}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>ホームに戻る</Button>
          <Button onClick={() => onOpenChange(false)}>次へ</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function DescribePage() {
  const imageUrl = "https://images.unsplash.com/photo-1777060971398-d1c72a00932a?q=80&w=1074&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"

  const [userText, setUserText] = useState("")
  const [feedback, setFeedback] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const postData = {
      imageUrl: formData.get("imageUrl"),
      userText: formData.get("userText"),
    };

    try {
      const response = await fetch('/api/grade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postData),
      });

      if (!response.ok) {
        throw new Error("採点APIでエラーが発生しました");
      }
      const result = await response.json();
      console.log(result);

      setFeedback(result.content?.[1]?.text ?? "フィードバックを取得できませんでした");
      setIsModalOpen(true);
    } catch (error) {
      console.error("ERROR:", error);
      setFeedback("エラーが発生しました。もう一度お試しください。");
      setIsModalOpen(true);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex h-full gap-8 bg-gray-100">
      {/* 画像と回答入力フォームセクション */}
      <section className="flex w-3/5 items-center justify-center">
        <div className="flex flex-col gap-8 bg-white p-16 pb-0 rounded-md">
          <AspectRatio ratio={16 / 9} className="rounded-lg bg-muted w-128">
            <Image
              src={imageUrl}
              alt="rabbit"
              fill
              className="rounded-lg object-cover"
            />
          </AspectRatio>

          <div className="flex justify-between">
            <span>経過時間</span>
            <span>本日n枚目</span>
          </div>

          <form method="post" onSubmit={handleSubmit} className="grid gap-2 justify-items-center w-128 h-64">
            <input type="hidden" name="imageUrl" value={imageUrl} />
            <Textarea required rows={8} placeholder="説明" name="userText" />
            <Button type="submit" className="w-full">送信</Button>
          </form>
        </div>
      </section>

      {/* AI1とAI2セクション */}
      <section className="flex w-2/5 p-16">
        <Message className="h-full bg-white">
          <MessageAvatar>
            <Avatar>
              <AvatarImage src="" alt="" />
              <AvatarFallback>You</AvatarFallback>
            </Avatar>
          </MessageAvatar>
          <MessageContent>
            <Bubble>
              <BubbleContent>How can I help you today?</BubbleContent>
            </Bubble>
          </MessageContent>
        </Message>
      </section>

      {/*結果表示モーダル*/}
      <ResultModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        feedback={feedback}
      />
    </div>
  )
}
