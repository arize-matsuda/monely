import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Vitest の設定。
 *
 * **DAL の認可テストが主目的**（ADR-0005 の約束 C）。
 * 「他世帯のデータが取れないこと」を確かめるので、
 * DB へのクエリはモックせず、**ローカルの捨て Postgres に本物のクエリを投げる**。
 * モックでは `where` の書き忘れを検出できない。
 *
 * ローカル DB の起動: ./scripts/test-db.sh up
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // server-only は Next.js のバンドラが解決する仮想モジュール。
      // Node から require できないので空のモジュールに差し替える
      "server-only": fileURLToPath(
        new URL("./src/test/server-only-stub.ts", import.meta.url),
      ),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    setupFiles: ["./src/test/setup.ts"],
    // DB を共有するテストが並行で干渉しないように直列で動かす。
    // 件数が少ないので速度は問題にならない
    fileParallelism: false,
    // Prisma の起動を待つことがあるので少し長めに
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
});
