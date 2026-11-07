"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * ブラウザ用の Supabase クライアント。
 *
 * **認証にのみ使う。** データアクセスは Server Action 経由で Prisma を使う。
 * v1 では使う場面がほぼ無いが、@supabase/ssr の Cookie 管理を
 * ブラウザ側でも一貫させるために用意しておく。
 */
export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL と NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY を設定してください",
    );
  }
  return createBrowserClient(url, publishableKey);
}
