/*
 * 土台の確認用のプレースホルダ。
 * M2 で認証後のルートグループ src/app/(app)/page.tsx を作る際に、このファイルは削除する
 * （同じ "/" に解決されるため共存できない）。
 * → docs/04-development/implementation-plan.md M2
 */

const tokens = [
  { name: "background", className: "bg-background" },
  { name: "surface", className: "bg-surface" },
  { name: "border", className: "bg-border" },
  { name: "foreground", className: "bg-foreground" },
  { name: "muted", className: "bg-muted" },
  { name: "accent", className: "bg-accent" },
  { name: "income", className: "bg-income" },
  { name: "danger", className: "bg-danger" },
];

export default function Page() {
  return (
    <main className="mx-auto w-full max-w-[480px] flex-1 px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Monely</h1>
      <p className="mt-1 text-muted">わが家の家計簿</p>

      <section className="mt-8 rounded-xl border border-border bg-surface p-4">
        <h2 className="text-sm font-medium text-muted">土台の確認</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex items-baseline justify-between">
            <dt className="text-muted">支出</dt>
            <dd className="tabular-nums">¥182,400</dd>
          </div>
          <div className="flex items-baseline justify-between">
            <dt className="text-muted">収入</dt>
            <dd className="text-income tabular-nums">+¥320,000</dd>
          </div>
          <div className="flex items-baseline justify-between border-t border-border pt-2">
            <dt className="text-muted">差額</dt>
            <dd className="text-income tabular-nums">+¥137,600</dd>
          </div>
        </dl>
      </section>

      <section className="mt-4 rounded-xl border border-border bg-surface p-4">
        <h2 className="text-sm font-medium text-muted">
          カラートークン（OS のダークモードで切り替わる）
        </h2>
        <ul className="mt-3 grid grid-cols-2 gap-2 text-xs">
          {tokens.map((token) => (
            <li key={token.name} className="flex items-center gap-2">
              <span
                className={`${token.className} size-5 shrink-0 rounded border border-border`}
              />
              <span className="font-mono text-muted">{token.name}</span>
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-8 text-xs text-muted">
        次の実装は M1（Supabase のスキーマ適用）。 進行状況は
        docs/04-development/task-list.md を参照。
      </p>
    </main>
  );
}
