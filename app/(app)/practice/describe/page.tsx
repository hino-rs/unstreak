import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import Image from "next/image"
import { AspectRatio } from "@/components/ui/aspect-ratio"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Bubble, BubbleContent } from "@/components/ui/bubble"
import { Message, MessageAvatar, MessageContent } from "@/components/ui/message"
import { Separator } from "@/components/ui/separator"

export default function DescribePage() {
  return (
    <div className="flex h-full gap-8">
      {/* 画像と回答入力フォームセクション */}
      <section className="flex flex-col h-full w-1/2 gap-8">
        <AspectRatio ratio={16 / 9} className="rounded-lg bg-muted">
          <Image
            src="https://images.unsplash.com/photo-1777060971398-d1c72a00932a?q=80&w=1074&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
            alt="rabbit"
            fill
            className="rounded-lg object-cover"
          />
        </AspectRatio>

        <form action="" className="grid gap-2 h-full justify-items-center">
          <Textarea required rows={8} placeholder="説明" />
          <Button className="w-1/2">送信</Button>
        </form>
      </section>

      {/* AI1とAI2セクション */}
      <section className="flex flex-col h-full w-1/2 gap-4">
        <div className="h-1/2">
          <p>この画像について英語で説明してみて!!</p>
        </div>

        <Separator />        

        <Message className="h-1/2">
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
    </div>
  )
}
