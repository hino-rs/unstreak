import Link from "next/link"
import { fredoka } from "@/lib/fonts"
import { Separator } from "@/components/ui/separator"

export default function MarketingPageLayout({children}: {children: React.ReactNode}) {
    return (
        <div className="">
            <header className="border-b flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-2">
                    <Link href="/dashboard"><div className={`${fredoka.className} text-3xl font-semibold tracking-tight text-violet-500`}>Unstreak</div></Link>
                </div>
                {/* 
                <div className="flex items-center gap-6">
                    <nav className="flex items-center gap-6">
                        <a href="#" className="hover:text-gray-900">Products</a>
                        <a href="#" className="hover:text-gray-900">Efficacy</a>
                        <a href="#" className="hover:text-gray-900">Careers</a>
                        <a href="#" className="hover:text-gray-900">Press</a>
                        <a href="#" className="hover:text-gray-900">Blog</a>
                        <a href="#" className="hover:text-gray-900">Contact</a>
                    </nav>
                    
                    <SeparatorVertical />
                    <div className="flex items-center gap-4">
                        将来SNSなどをここに
                    </div>
                    
                </div>
                */}
            </header>
            <main>
                {children}
            </main>
            <Separator />
            <footer className="flex">
                
            </footer>
        </div>
    )
}
