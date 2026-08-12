"use server";

import { createSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function logout() {
  const supabase = await createSupabaseClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("ログアウトエラー:", error.message);
  } else {
    console.log("ログアウトしました");
  }
  return redirect("/login");
}

export async function login(formData: FormData) {
  const supabase = await createSupabaseClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error("登録エラー:", error.message);
    return redirect("/login?error=" + encodeURIComponent(error.message));
  }

  console.log("ログイン成功:", data);
  return redirect(`/dashboard`);
}

export async function signup(formData: FormData) {
  const supabase = await createSupabaseClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    console.error("登録エラー:", error.message);
    return redirect("/signup?error=" + encodeURIComponent(error.message));
  }

  return redirect(`/dashboard`);
}
