"use server";

import { createSupabaseClient } from "@/lib/supabase/server";
import { checkAuthEmailRateLimit, checkAuthIpRateLimit } from "@/lib/rate-limit";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { GRADE_BANDS, type GradeBand } from "@/lib/level";
import type { AuthError } from "@supabase/supabase-js";

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

// Supabaseのエラーコード -> ユーザー向け日本語メッセージ。未知のコードは元のmessageをそのまま表示する
const AUTH_ERROR_MESSAGES_JA: Record<string, string> = {
  user_already_exists: "このメールアドレスは既に登録されています。ログインをお試しください。",
  email_exists: "このメールアドレスは既に登録されています。ログインをお試しください。",
  invalid_credentials: "メールアドレスまたはパスワードが正しくありません。",
  email_not_confirmed: "メールアドレスの確認がまだ完了していません。届いた確認メールのリンクをクリックしてください。",
  weak_password: "パスワードが脆弱です。もう少し複雑なパスワードを設定してください。",
  over_email_send_rate_limit: "メール送信回数の上限に達しました。しばらくしてから再度お試しください。",
  over_request_rate_limit: TOO_MANY_ATTEMPTS_MESSAGE,
  email_address_invalid: "メールアドレスの形式が正しくありません。",
};

function translateAuthError(error: AuthError): string {
  return AUTH_ERROR_MESSAGES_JA[error.code ?? ""] ?? error.message;
}

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
    console.error("ログインエラー:", error.message);
    const params = new URLSearchParams({ error: translateAuthError(error) });
    if (error.code === "email_not_confirmed") {
      params.set("unconfirmed_email", email);
    }
    return redirect(`/login?${params.toString()}`);
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

  // 別アカウントでログイン中のままサインアップすると、確認メール待ちの間
  // 古いセッションのCookieが残り続けて「元のアカウントでログインされる」原因になるため、
  // 新規登録の前に明示的に破棄しておく
  await supabase.auth.signOut();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { grade_band: gradeBand },
      // 未指定だとGoTrueの確認メールリンクがサイトのルートに着地し、/auth/callbackの
      // コード交換処理を一切通らない(=セッションが確立されない)ため明示する
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/auth/confirmed`,
    },
  });

  if (error) {
    console.error("登録エラー:", error.message);
    return redirect("/signup?error=" + encodeURIComponent(translateAuthError(error)));
  }

  // メール確認が有効な場合、signUpは新しいセッションを発行しない(data.sessionがnull)。
  // その状態でdashboardへ飛ばすとセッションが無いままになる(前段のsignOutで古いセッションも
  // 既に破棄済みなので、意図せず別アカウントに見えることもない)ため、確認案内ページへ誘導する。
  if (!data.session) {
    return redirect(`/signup/confirm?email=${encodeURIComponent(email)}`);
  }

  return redirect(`/dashboard`);
}

export async function resendConfirmationEmail(email: string): Promise<{ error?: string }> {
  if (!email) {
    return { error: MISSING_CREDENTIALS_MESSAGE };
  }

  const withinLimit = await checkAuthRateLimits(email);
  if (!withinLimit) {
    return { error: TOO_MANY_ATTEMPTS_MESSAGE };
  }

  const supabase = await createSupabaseClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/auth/confirmed`,
    },
  });
  if (error) {
    console.error("確認メール再送信エラー:", error.message);
    return { error: translateAuthError(error) };
  }

  return {};
}

// 確認メール待ちのタブ(/signup/confirm)が、別タブでのメール確認完了をポーリングで検知するために使う。
// 確認が完了すると/auth/callbackが同じブラウザのCookieにセッションを書き込むため、ここで拾える。
// UI表示の切り替えのみに使う軽量チェックなので、Auth serverに問い合わせるgetUser()ではなく
// Cookie上のセッションを見るだけのgetSession()で十分(認可判断はdashboard側で別途getUser()により行う)
export async function checkSessionExists(): Promise<boolean> {
  const supabase = await createSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  return !!session;
}
