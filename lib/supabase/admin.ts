import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

// service-roleクライアント。RLSを完全にバイパスする。
// 呼び出し元は必ず事前にgetUser()等でリクエスト元の本人確認を行うこと。
// 現在の利用箇所: Stripe webhookハンドラ(app/api/stripe/webhook/route.ts)、
// 退会処理(app/(app)/settings/actions.ts)。
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
