import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

// service-roleクライアント。RLSを完全にバイパスする。
// Stripe webhookハンドラ(app/api/stripe/webhook/route.ts)以外からは絶対にimportしないこと。
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
