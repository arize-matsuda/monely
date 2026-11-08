import "server-only";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./db";

/**
 * better-auth に渡す DB アダプタ。
 *
 * **ここに置く理由**: 約束 A は「`prisma` を `src/lib/data/` の外から
 * import しない」。`src/lib/auth/server.ts` が直接 `db.ts` を読むと
 * 検出用の grep が 0 件にならず、チェックの価値が落ちる。
 * DB に触るものは DAL が持つ、という原則をそのまま守る。
 *
 * better-auth が触るのは user / session / account / verification だけで、
 * アプリのドメインテーブル（households / transactions など）には触らない。
 *
 * → docs/05-decisions/ADR-0005-authorization-in-app-layer.md
 */
export const authDatabaseAdapter = prismaAdapter(prisma, {
  provider: "postgresql",
});
