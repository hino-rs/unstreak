import { createClient } from "@/utils/supabase/server"
import { Button } from "@/components/ui/button";
import { logout } from "../(auth)/actions";

export default async function AppPageLayout({ children }: { children: React.ReactNode }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    return (
        <>
            <header className="bg-blue-50">
                {user ? (
                    <>
                        <span>ログイン中: {user.email}</span>
                        <form action={logout}>
                            <Button type="submit">ログアウト</Button>
                        </form>
                    </>
                ) : (
                    <span>未ログイン</span>
                )}
            </header>
            <main>
                {children}
            </main>
        </>
    )
}
