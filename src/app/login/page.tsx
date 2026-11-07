import { Suspense } from "react";
import { LoginForm } from "./login-form";

export const metadata = { title: "ログイン | Monely" };

/**
 * ログイン画面。**公開ページなので静的シェルを保つ。**
 *
 * `?error=1`（リンクが無効・期限切れ）の通知だけが searchParams に依存するため、
 * そこだけ <Suspense> の内側に押し込む。ページ本体（見出しとフォーム）は
 * プリレンダリングされる。
 * → docs/05-decisions/ADR-0004-instant-false-for-authed-segments.md
 */
export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col justify-center px-4 py-10">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Monely</h1>
        <p className="mt-1 text-muted">わが家の家計簿</p>
      </div>

      <Suspense fallback={null}>
        <LinkErrorNotice searchParams={searchParams} />
      </Suspense>

      <LoginForm />

      <p className="mt-8 text-xs leading-relaxed text-muted">
        パスワードはありません。届いたメールのリンクを開くとログインできます。
      </p>
    </main>
  );
}

async function LinkErrorNotice({
  searchParams,
}: {
  searchParams: PageProps<"/login">["searchParams"];
}) {
  const params = await searchParams;
  if (params.error === undefined) return null;

  return (
    <p
      className="mb-4 rounded-xl border border-danger/40 bg-danger/10 px-3.5 py-3 text-sm text-danger"
      role="alert"
    >
      リンクが無効か期限切れです。もう一度ログインリンクを送ってください。
    </p>
  );
}
