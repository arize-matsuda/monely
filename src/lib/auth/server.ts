import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { magicLink } from "better-auth/plugins/magic-link";
import { prisma } from "@/lib/data/db";
import { sendMail } from "@/lib/email";
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from "@/lib/validation";

/**
 * better-auth の設定。**認証の中心。**
 *
 * 認証方式は ADR-0006 のまま:
 *   - メールアドレス + パスワード（主）
 *   - 新規登録時にメール確認を必須にする
 *   - マジックリンクはパスワードを忘れたときの導線
 *
 * → docs/05-decisions/ADR-0007-better-auth.md
 *
 * **スキーマを変えたら prisma/schema.prisma の user / session / account /
 * verification を getAuthTables() の出力と突き合わせること。**
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

const baseURL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

export const auth = betterAuth({
  appName: "Monely",
  baseURL,
  secret: requiredEnv("BETTER_AUTH_SECRET"),
  // callbackURL の検証に使う。自分のオリジン以外へは飛ばさない
  trustedOrigins: [baseURL],

  database: prismaAdapter(prisma, { provider: "postgresql" }),

  emailAndPassword: {
    enabled: true,
    // 確認が済むまでセッションを作らない（ADR-0006）
    requireEmailVerification: true,
    minPasswordLength: MIN_PASSWORD_LENGTH,
    maxPasswordLength: MAX_PASSWORD_LENGTH,
    sendResetPassword: async ({ user, url }) => {
      await sendMail({
        to: user.email,
        subject: "【Monely】パスワードの再設定",
        text: [
          "以下のリンクを開くとパスワードを再設定できます。",
          "",
          url,
          "",
          "このリンクは 1 時間で期限切れになります。",
          "心当たりがない場合はこのメールを破棄してください。",
        ].join("\n"),
      });
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    // 未確認のアカウントでログインを試したとき、確認リンクを再送する。
    // これが無いと、最初のリンクを逃した利用者が入れなくなる（実際に詰まった）
    sendOnSignIn: true,
    // 確認が済んだらそのままログインさせる（メール → パスワード入力の二度手間を避ける）
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendMail({
        to: user.email,
        subject: "【Monely】メールアドレスの確認",
        text: [
          "Monely へのご登録ありがとうございます。",
          "以下のリンクを開くと登録が完了します。",
          "",
          url,
          "",
          "このリンクは 1 時間で期限切れになります。",
        ].join("\n"),
      });
    },
  },

  plugins: [
    // パスワードを忘れたときの導線（FR-A6）
    magicLink({
      disableSignUp: true, // リンク経由で新規登録させない
      sendMagicLink: async ({ email, url }) => {
        await sendMail({
          to: email,
          subject: "【Monely】ログイン用のリンク",
          text: [
            "以下のリンクを開くとログインできます。",
            "",
            url,
            "",
            "このリンクは一度だけ使えます。",
            "ログインしたら設定画面でパスワードを変更できます。",
          ].join("\n"),
        });
      },
    }),
    // Server Action から呼んだときに Cookie を書けるようにする。
    // **プラグインの最後に置く**必要がある（better-auth の作法）
    nextCookies(),
  ],

  user: {
    // 表示名と所属世帯は Monely 側の Profile が持つ。
    // better-auth の user.name は登録時のメールアドレスのローカル部を入れる
    modelName: "user",
  },
});

export type Auth = typeof auth;
