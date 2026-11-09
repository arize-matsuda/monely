import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "./auth/server";
import { findOrCreateProfile } from "./data/profile";
import type { Me, Member } from "./types";

/**
 * 認証と世帯所属のガード。
 *
 * **`requireMember()` が世帯 ID の唯一の供給源。** DAL の関数はこれを呼び、
 * 世帯 ID を引数で受け取らない（ADR-0005 約束 B）。
 *
 * セッションは better-auth が `session` テーブルで管理する。
 * Supabase Auth のときのような HTTP 往復は無く、同じ DB への 1 クエリで済む。
 * → docs/05-decisions/ADR-0007-better-auth.md
 */

/**
 * ログイン中のユーザー。**`React.cache` で 1 リクエスト内の重複を消す。**
 *
 * **これが無いと同じ画面で何度も同じクエリを投げる。** DAL の全関数が
 * `requireMember()` を呼ぶ設計（約束 B）なので、ホーム画面では
 * レイアウトの 2 回 + ページの 4 回 = **6 回**呼ばれていた。
 * 1 回あたり「セッション + ユーザー」と「プロフィール」で DB を往復するため、
 * 実際のデータ取得より認証のほうが重いという状態だった（2026-11-09 に判明）。
 *
 * `cache` はリクエストごとに空になるので、**毎リクエストで必ず検証する**点は
 * 変わらない。セッションを跨いで使い回すことはない。
 * → node_modules/next/dist/docs/01-app/01-getting-started/06-fetching-data.md
 *   「Reusing data with React.cache」
 */
export const getMe = cache(async (): Promise<Me | null> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;

  const profile = await findOrCreateProfile(
    session.user.id,
    session.user.email ?? null,
  );

  return {
    userId: session.user.id,
    profileId: profile.id,
    email: session.user.email ?? null,
    displayName: profile.displayName,
    householdId: profile.householdId,
  };
});

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
