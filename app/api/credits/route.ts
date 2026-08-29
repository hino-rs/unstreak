import { NextResponse } from "next/server";
import { createSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: balance } = await supabase
    .from("credit_balances")
    .select("credits")
    .eq("user_id", user.id)
    .single();

  return NextResponse.json({ credits: balance?.credits ?? 0 });
}
