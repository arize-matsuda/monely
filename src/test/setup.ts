import { config } from "dotenv";

/**
 * テストの前処理。
 *
 * `.env.test` を読む（本番の `.env.local` は読まない）。
 * **本番の DB に繋がないことを必ず確認する。**
 */
config({ path: ".env.test" });

const url = process.env.DATABASE_URL;

if (!url) {
  throw new Error(
    "テスト用の DATABASE_URL が設定されていません。.env.test を確認してください",
  );
}

// 事故防止。テストはローカルの捨て DB に対してだけ実行する
const isLocal =
  url.includes("localhost") ||
  url.includes("127.0.0.1") ||
  url.includes("@postgres:");

if (!isLocal) {
  throw new Error(
    [
      "テスト用の DATABASE_URL がローカルを指していません。",
      "テストは本番の DB に対して実行してはいけません（データを消します）。",
      ".env.test を確認してください。",
    ].join("\n"),
  );
}
