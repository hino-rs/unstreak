import Link from "next/link"
import { fredoka } from "@/lib/fonts"
import { Separator } from "@/components/ui/separator"

export default function LegalPageLayout({children}: {children: React.ReactNode}) {
    return (
        <div className="">
            <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md flex items-center px-6 py-3">
                <Link href="/"><div className={`${fredoka.className} text-2xl sm:text-3xl font-semibold tracking-tight text-violet-500`}>Unstreak</div></Link>
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
                </div>
                <div>&copy; {new Date().getFullYear()} Unstreak</div>
            </footer>
        </div>
    )
}
