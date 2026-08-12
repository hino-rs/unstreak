import Link from "next/link"
import { fredoka } from "@/lib/fonts"

export default function AuthPageLayout({children}: {children: React.ReactNode}) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-8 bg-slate-50 px-4 py-16">
            <Link href="/">
                <div className={`${fredoka.className} text-2xl font-semibold tracking-tight text-violet-500`}>
                    Unstreak
                </div>
            </Link>
            {children}
        </div>
    )
}