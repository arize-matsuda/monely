import "server-only";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { findOrCreateProfile } from "./data/profile";
import { createSupabaseServerClient } from "./supabase/server";
import type { Me, Member } from "./types";

/**
 * 認証と世帯所属のガード。
 *
 * **`requireMember()` が世帯 ID の唯一の供給源。** DAL の関数はこれを呼び、
 * 世帯 ID を引数で受け取らない（ADR-0005 約束 B）。
 *
 * `getSession()` は Cookie の中身をそのまま返すため改ざんの検証を伴わない。
 * サーバー側の判断には必ず `getUser()` を使う。
 */

export async function getMe(): Promise<Me | null> {
  // supabase-js はトークンの期限判定で Date.now() を読む。
  // cacheComponents 有効下ではプリレンダリング中の不安定な値として警告されるため、
  // リクエスト時に評価されることを明示する。
  // → Next.js の blocking-prerender-current-time の推奨どおり
  await connection();

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const profile = await findOrCreateProfile(user.id, user.email ?? null);

  return {
    userId: user.id,
    profileId: profile.id,
    email: user.email ?? null,
    displayName: profile.displayName,
    householdId: profile.householdId,
  };
}

/** ログイン必須。未ログインなら /login へ */
export async function requireUser(): Promise<Me> {
  const me = await getMe();
  if (!me) redirect("/login");
  return me;
}

/** ログイン + 世帯所属が必須。未ログインなら /login、世帯なしなら /setup へ */
export async function requireMember(): Promise<Member> {
  const me = await requireUser();
  if (!me.householdId) redirect("/setup");
  return { ...me, householdId: me.householdId };
}
