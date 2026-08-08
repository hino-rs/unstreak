import { createSupabaseClient } from "@/utils/supabase/server";
import { UserIcon } from "@/components/user-icon";
import Link from "next/link";
import { Fredoka } from "next/font/google";

const fredoka = Fredoka({ subsets: ['latin'], weight: ['400', '600'] });

export default async function AppPageLayout({ children }: { children: React.ReactNode }) {
    const supabase = await createSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    return (
        <div className="flex min-h-screen">
            <aside className="w-64 shrink-0 border-r border-gray-200 p-4 flex flex-col gap-2">
                <Link href="/"><div className={`${fredoka.className} text-2xl font-semibold tracking-tight text-purple-500`}>Unstreak</div></Link>
                <Link href="/"><div className={`${fredoka.className} text-2xl font-semibold tracking-tight text-violet-500`}>Unstreak</div></Link>
                <Link href="/"><div className={`${fredoka.className} text-2xl font-semibold tracking-tight text-indigo-500`}>Unstreak</div></Link>

                {user ? (
                    <>
                        <Link href="/dashboard"><button className="text-left px-3 py-2 rounded hover:bg-gray-100">ホーム</button></Link>
                        <Link href="/practice/describe"><button className="text-left px-3 py-2 rounded hover:bg-gray-100">画像説明ドリル</button></Link>
                        <Link href="/practice/diary"><button className="text-left px-3 py-2 rounded hover:bg-gray-100">日記</button></Link>
                        <Link href="/practice/topic"><button className="text-left px-3 py-2 rounded hover:bg-gray-100">トピック説明</button></Link>
                        <Link href="/review"><button className="text-left px-3 py-2 rounded hover:bg-gray-100">振り返り</button></Link>
                        <Link href="/settings"><button className="text-left px-3 py-2 rou/nded hover:bg-gray-100">設定</button></Link>
                        <UserIcon user={user} />
                    </>
                ) : (<span>ログインしてください</span>)}
            </aside>
            <main className="flex-1 p-6">
                {children}
            </main>
        </div>
    );
}
