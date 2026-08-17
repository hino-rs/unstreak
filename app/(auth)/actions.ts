"use server";

import { createSupabaseClient } from "@/lib/supabase/server";
import { checkAuthEmailRateLimit, checkAuthIpRateLimit } from "@/lib/rate-limit";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { GRADE_BANDS, type GradeBand } from "@/lib/level";

async function getClientIp(): Promise<string | null> {
  const h = await headers();
  // x-vercel-forwarded-forはVercelのエッジが上書きする値でクライアントから偽装できない。
  // x-forwarded-forは先頭の値をクライアントが自由に詐称できるため、フォールバック専用。
  const vercelForwardedFor = h.get("x-vercel-forwarded-for");
  if (vercelForwardedFor) return vercelForwardedFor.split(",")[0].trim();
  const forwardedFor = h.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  const realIp = h.get("x-real-ip");
  if (realIp) return realIp;
  return null;
}

const TOO_MANY_ATTEMPTS_MESSAGE = "試行回数が多すぎます。しばらくしてから再度お試しください。";
const MISSING_CREDENTIALS_MESSAGE = "メールアドレスとパスワードを入力してください。";

async function checkAuthRateLimits(email: string): Promise<boolean> {
  const ip = await getClientIp();
  const checks = [checkAuthEmailRateLimit(email)];
  if (ip) checks.push(checkAuthIpRateLimit(ip));
  const results = await Promise.all(checks);
  return results.every((r) => r.success);
}

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
  const email = formData.get("email");
  const password = formData.get("password");
  if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
    return redirect("/login?error=" + encodeURIComponent(MISSING_CREDENTIALS_MESSAGE));
  }

  const withinLimit = await checkAuthRateLimits(email);
  if (!withinLimit) {
    return redirect("/login?error=" + encodeURIComponent(TOO_MANY_ATTEMPTS_MESSAGE));
  }

  const supabase = await createSupabaseClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error("登録エラー:", error.message);
    return redirect("/login?error=" + encodeURIComponent(error.message));
  }

  console.log("ログイン成功:", data.user?.id);
  return redirect(`/dashboard`);
}

export async function signup(formData: FormData) {
  const email = formData.get("email");
  const password = formData.get("password");
  const gradeBand = formData.get("grade_band");
  if (
    typeof email !== "string" || typeof password !== "string" ||
    typeof gradeBand !== "string" || !email || !password ||
    !GRADE_BANDS.includes(gradeBand as GradeBand)
  ) {
    return redirect("/signup?error=" + encodeURIComponent(MISSING_CREDENTIALS_MESSAGE));
  }

  const withinLimit = await checkAuthRateLimits(email);
  if (!withinLimit) {
    return redirect("/signup?error=" + encodeURIComponent(TOO_MANY_ATTEMPTS_MESSAGE));
  }

  const supabase = await createSupabaseClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { grade_band: gradeBand } },
  });

  if (error) {
    console.error("登録エラー:", error.message);
    return redirect("/signup?error=" + encodeURIComponent(error.message));
  }

  return redirect(`/dashboard`);
}
