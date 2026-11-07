import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth/server";

/**
 * better-auth のエンドポイント。
 * メール確認・パスワード再設定・マジックリンクのリンクはここに来る。
 *
 * **v1 でアプリが持つ唯一の API 経路。** これ以外に Route Handler を作らない。
 * → docs/02-design/api-design.md
 */
export const { GET, POST } = toNextJsHandler(auth);
