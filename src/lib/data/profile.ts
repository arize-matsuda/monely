import "server-only";
import { prisma } from "./db";

/**
 * プロフィールの取得・作成。
 *
 * **このファイルは「約束 B（世帯 ID を引数で受け取らない）」の唯一の例外。**
 * 身元を確立するブートストラップなので、ここだけは Supabase のユーザー ID を
 * 引数で受け取る。requireMember() から世帯 ID を得ることはできない
 * （世帯 ID を得るためにこの関数が必要なので循環する）。
 *
 * 安全である理由:
 *   - 渡される userId は supabase.auth.getUser() がサーバー側で検証した値だけ
 *   - この関数は userId に一致する 1 行しか読まない／作らない
 *   - 他のテーブルには一切触れない
 *
 * → docs/05-decisions/ADR-0005-authorization-in-app-layer.md
 */

/** 初回ログイン時にプロフィールを作る。既にあればそれを返す */
export async function findOrCreateProfile(
  userId: string,
  email: string | null,
) {
  const existing = await prisma.profile.findUnique({ where: { userId } });
  if (existing) return existing;

  return prisma.profile.create({
    data: { userId, displayName: initialDisplayName(email) },
  });
}

/** 表示名の初期値はメールアドレスの @ より前 */
function initialDisplayName(email: string | null): string {
  const localPart = (email ?? "").split("@")[0]?.trim() ?? "";
  if (localPart.length === 0) return "メンバー";
  return localPart.slice(0, 20);
}
