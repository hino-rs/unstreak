import { zenMaruGothic } from "@/lib/fonts";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function LegalPage({
  title,
  updatedAt,
  children,
}: {
  title: string;
  updatedAt: string;
  children: React.ReactNode;
}) {
  return (
    <div className="px-4 py-16 sm:py-20">
      <div className="max-w-2xl mx-auto">
        <Badge variant="secondary" className="mb-4">
          仮公開版
        </Badge>
        <h1
          className={cn(
            "text-3xl sm:text-4xl font-bold text-slate-900 mb-3 leading-snug",
            zenMaruGothic.className
          )}
        >
          {title}
        </h1>
        <p className="text-sm text-slate-400 mb-8">最終更新日：{updatedAt}</p>

        <div className="rounded-2xl border border-violet-100 bg-violet-50/60 px-5 py-4 mb-12 text-sm text-slate-600 leading-relaxed">
          本ページは、開発中のUnstreakを実際にお使いいただくための暫定的な内容です。
          専門家によるレビューを経た正式版へ、事前の告知なく差し替わる場合があります。
          内容についてご不明点があれば、下記お問い合わせ先までご連絡ください。
        </div>

        <div className="flex flex-col gap-12">{children}</div>
      </div>
    </div>
  );
}

export function LegalSection({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-4 leading-snug">
        {heading}
      </h2>
      <div className="flex flex-col gap-4 text-slate-600 leading-loose [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-2 [&_a]:text-violet-600 [&_a]:underline [&_a]:underline-offset-2">
        {children}
      </div>
    </section>
  );
}
