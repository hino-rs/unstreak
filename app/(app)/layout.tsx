import { createSupabaseClient } from "@/lib/supabase/server";
import { UserIcon } from "@/components/user-icon";
import Link from "next/link";
import { fredoka } from "@/lib/fonts";
import { LockClosedIcon } from "@heroicons/react/24/solid";
import { AiAssistantPanel } from "@/components/ai-assistant-panel";

export default async function AppPageLayout({ children }: { children: React.ReactNode }) {
    const supabase = await createSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    return (
        <div className="flex h-screen w-full overflow-hidden bg-background">
            <aside className="w-64 shrink-0 p-4 flex flex-col gap-2 overflow-y-auto border-r border-border bg-card/30">
                <Link href="/dashboard"><div className={`${fredoka.className} text-3xl font-semibold tracking-tight text-violet-500`}>Unstreak</div></Link>

                {user ? (
                    <>
                        <Link href="/dashboard"><button className="text-left px-3 py-2 rounded hover:bg-gray-100 w-full font-medium text-sm">ホーム</button></Link>
                        <Link href="/practice/describe"><button className="text-left px-3 py-2 rounded hover:bg-gray-100 w-full font-medium text-sm">画像説明ドリル</button></Link>
                        <Link href="/practice/diary"><button className="text-left px-3 py-2 rounded hover:bg-gray-100 text-gray-400 flex items-center gap-1.5 w-full font-medium text-sm"><LockClosedIcon className="w-4 h-4" />日記</button></Link>
                        <Link href="/practice/topic"><button className="text-left px-3 py-2 rounded hover:bg-gray-100 text-gray-400 flex items-center gap-1.5 w-full font-medium text-sm"><LockClosedIcon className="w-4 h-4" />トピック説明</button></Link>
                        <Link href="/review"><button className="text-left px-3 py-2 rounded hover:bg-gray-100 w-full font-medium text-sm">振り返り</button></Link>
                        <Link href="/settings"><button className="text-left px-3 py-2 rounded hover:bg-gray-100 w-full font-medium text-sm">設定</button></Link>
                        <div className="mt-auto pt-4">
                            <UserIcon user={user} />
                        </div>
                    </>
                ) : (<span>ログインしてください</span>)}
            </aside>
            <main className="flex flex-1 min-w-0 h-full overflow-y-auto flex-col">
                {children}
            </main>
            <aside className="w-80 shrink-0 p-4 flex flex-col overflow-y-auto border-l border-border bg-card/30">
                <AiAssistantPanel />
            </aside>
        </div>
    );
}
