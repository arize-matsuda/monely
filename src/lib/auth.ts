import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
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

export async function getMe(): Promise<Me | null> {
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
