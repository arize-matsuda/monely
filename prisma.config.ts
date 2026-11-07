// Prisma CLI（マイグレーション）専用の設定。
// アプリ実行時の接続はここを見ない（src/lib/data/db.ts が DATABASE_URL を使う）。
//
// Prisma 7 は .env を自動で読まないため、dotenv で .env.local を明示的に読む。
// 秘密情報の置き場所は .env.local 1 つに統一している（Next.js と共用）。
//
// ここでは **DIRECT_URL（Session pooler, 5432）** を使う。
// マイグレーションは DDL とアドバイザリロックを使うため、
// Transaction pooler（6543, pgbouncer=true）では応答が返らずハングする（実測）。
// → docs/02-design/database-design.md §7
import { config } from "dotenv";

config({ path: ".env.local" });

const { defineConfig, env } = await import("prisma/config");

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DIRECT_URL"),
  },
});
