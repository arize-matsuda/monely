// Prisma CLI の設定。Prisma 7 は .env を自動で読まないため明示的に読み込む。
//
// 秘密情報の置き場所は .env.local 1 つに統一する（Next.js と Prisma CLI で共用）。
// 接続は Supabase の「Session pooler」（ポート 5432）1 本だけを使う。
//   - IPv4 で繋がる（無料プランの直接接続は IPv6 のみ）
//   - prepared statement やアドバイザリロックが使えるので migrate が素直に通る
//   - 利用者が数人なのでトランザクションモードの接続効率は不要
// → docs/02-design/architecture.md
import { config } from "dotenv";

config({ path: ".env.local" });

const { defineConfig, env } = await import("prisma/config");

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
