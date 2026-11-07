import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * Prisma Client の唯一の生成口。
 *
 * **このモジュールを src/lib/data/ の外から import してはいけない。**
 * 認可（世帯 ID による絞り込み）は DAL の関数の中だけで行う約束になっている。
 * 画面と Server Action は src/lib/data/ の関数しか呼ばない。
 * → docs/05-decisions/ADR-0005-authorization-in-app-layer.md の「約束 A」
 *
 * 違反の検出:
 *   grep -rn "data/db" src --include=*.ts --include=*.tsx | grep -v "src/lib/data/"
 */

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `環境変数 ${name} が設定されていません。.env.local を確認してください`,
    );
  }
  return value;
}

function createPrismaClient(): PrismaClient {
  // Prisma 7 は driver adapter 必須。接続は Supabase の Session pooler（5432）
  const adapter = new PrismaPg({
    connectionString: requiredEnv("DATABASE_URL"),
  });
  return new PrismaClient({ adapter });
}

// 開発中の HMR で接続が増え続けないように、グローバルに 1 つだけ保つ
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
