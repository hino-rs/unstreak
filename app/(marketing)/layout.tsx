import Link from "next/link"
import { fredoka } from "@/lib/fonts"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"

export default function MarketingPageLayout({children}: {children: React.ReactNode}) {
    return (
        <div className="">
            <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md flex items-center justify-between px-6 py-3">
                <div className="flex items-center gap-2">
                    <Link href="/"><div className={`${fredoka.className} text-2xl sm:text-3xl font-semibold tracking-tight text-violet-500`}>Unstreak</div></Link>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                    <Button render={<Link href="/login" />} nativeButton={false} variant="ghost" size="sm">
                        ログイン
                    </Button>
                    <Button render={<Link href="/signup" />} nativeButton={false} size="sm" className="bg-violet-600 text-white hover:bg-violet-600/90">
                        無料ではじめる
                    </Button>
                </div>
            </header>
            <main>
                {children}
            </main>
            <Separator />
            <footer className="px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
                <div className={`${fredoka.className} text-base text-slate-500`}>Unstreak</div>
                <div className="flex items-center gap-4">
                    <Link href="/terms" className="hover:text-slate-600">利用規約</Link>
                    <Link href="/privacy" className="hover:text-slate-600">プライバシーポリシー</Link>
                    <Link href="/tokushoho" className="hover:text-slate-600">特定商取引法に基づく表記</Link>
                    <Link href="/login" className="hover:text-slate-600">ログイン</Link>
                    <Link href="/signup" className="hover:text-slate-600">無料ではじめる</Link>
                </div>
                <div>&copy; {new Date().getFullYear()} Unstreak</div>
            </footer>
        </div>
    )
}
