import { createSupabaseClient } from "@/lib/supabase/server";
import { UserIcon } from "@/components/user-icon";
import Link from "next/link";
import { fredoka } from "@/lib/fonts";
import { LockClosedIcon } from "@heroicons/react/24/solid";

export default async function AppPageLayout({ children }: { children: React.ReactNode }) {
    const supabase = await createSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    return (
        <div className="flex h-screen w-full overflow-hidden">
            <aside className="w-64 shrink-0 p-4 flex flex-col gap-2 overflow-y-auto">
                {/* <Link href="/"><div className={`${fredoka.className} text-2xl font-semibold tracking-tight text-purple-500`}>Unstreak</div></Link> */}
                <Link href="/dashboard"><div className={`${fredoka.className} text-3xl font-semibold tracking-tight text-violet-500`}>Unstreak</div></Link>
                {/* <Link href="/"><div className={`${fredoka.className} text-2xl font-semibold tracking-tight text-indigo-500`}>Unstreak</div></Link> */}

                {user ? (
                    <>
                        <Link href="/dashboard"><button className="text-left px-3 py-2 rounded hover:bg-gray-100">ホーム</button></Link>
                        <Link href="/practice/describe"><button className="text-left px-3 py-2 rounded hover:bg-gray-100">画像説明ドリル</button></Link>
                        <Link href="/practice/diary"><button className="text-left px-3 py-2 rounded hover:bg-gray-100 text-gray-400 flex"><LockClosedIcon className="w-6" />日記</button></Link>
                        <Link href="/practice/topic"><button className="text-left px-3 py-2 rounded hover:bg-gray-100 text-gray-400 flex"><LockClosedIcon className="w-6" />トピック説明</button></Link>
                        <Link href="/review"><button className="text-left px-3 py-2 rounded hover:bg-gray-100">振り返り</button></Link>
                        <Link href="/settings"><button className="text-left px-3 py-2 rounded hover:bg-gray-100">設定</button></Link>
                        <UserIcon user={user} />
                    </>
                ) : (<span>ログインしてください</span>)}
            </aside>
            <main className="flex flex-1 min-w-0 h-full overflow-y-auto flex-col">
                {children}
            </main>
            <aside className="w-64 shrink-0 p-4 flex flex-col gap-2 overflow-y-auto">

            </aside>
        </div>
    );
}
