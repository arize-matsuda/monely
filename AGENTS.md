<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

# Monely

スマホで数秒で記録できて、家族と同じ家計簿を見られる、自作の家計管理アプリ。
Next.js 16（App Router）+ Supabase（**PostgreSQL のみ**）+ **Prisma 7** + **better-auth** + Tailwind CSS v4 + Biome / pnpm。

> **2026-11-07 に認可の方針を変更した。** DB の RLS をやめ、アプリ層（`src/lib/data/`）に移した。古い記述を見かけたら `docs/05-decisions/ADR-0005-authorization-in-app-layer.md` が正。

## 作業を始める前に読む

設計の「正」は `docs/` にある。**推測で書き始めない。**

| 順 | ファイル | なぜ |
| --- | --- | --- |
| 0 | `docs/README.md` | 全ドキュメントの索引 |
| 1 | `docs/00-overview/project-overview.md` | 何を作るのか、**何を作らないのか** |
| 2 | `docs/04-development/task-list.md` | **いま何をすべきか。作業状態の正** |
| 3 | `docs/02-design/architecture.md` | ファイルの置き場所と責務、Next.js 16 固有の制約 |
| 4 | `docs/03-guidelines/security-guidelines.md` | **守らないと事故る** |
| 5 | `docs/03-guidelines/coding-standards.md` | 命名と実装ルール |

機能を実装するときは `docs/01-requirements/functional-requirements.md` の FR-ID と受入条件（AC-ID）を参照する。
用語・命名は `docs/00-overview/glossary.md` が正。**そこに無い言葉を新しく使わない**（使う場合は先に用語集に追記する）。

## 絶対に守ること

**認可はアプリ層にしかない。最終防衛線が無い。** 1〜4 は設計が成立する条件そのもの。

1. **`prisma` を `src/lib/data/` の外から import しない。** 画面と Server Action は DAL の関数だけを呼ぶ。
   検出: `grep -rn "data/db" src --include="*.ts" --include="*.tsx" | grep -v "^src/lib/data/"` が 0 件
2. **DAL のすべてのクエリに `householdId` の条件を付ける。** これが唯一の認可。
   `update({ where: { id } })` を使わない → `updateMany({ where: { id, householdId } })` にして `count === 0` なら `NOT_FOUND`。
3. **DAL の関数は世帯 ID を引数で受け取らない。** 関数の中で `requireMember()` から取る。`householdId` / `createdById` をクライアントから受け取らない。
4. **DAL に関数を足したら認可テストを同じコミットで足す。** テストの無い DAL 関数を作らない。
5. **`DATABASE_URL` / `DIRECT_URL` は DB の全権を持つ。** `NEXT_PUBLIC_` を付けない。`src/lib/data/db.ts` 以外から参照しない。Secret key（旧 `service_role`）も使わない。
6. **すべての Server Action の 1 行目で `requireMember()` を呼ぶ。** Server Action は UI を経由せず直接 POST できる。
7. **`getSession()` を認可の判断に使わない。** `getUser()` を使う。
8. **`categoryId` / `paidById` は参照先の所属を確認する。** 外部キーでは他世帯の ID を防げない。
9. **金額は整数（円）。** 浮動小数点の演算を使わない。
10. **`occurredOn`（`@db.Date`）の整形は UTC で行う。** ローカルタイムだと環境によって前日になる。
11. **`any` を使わない。** `queryRawUnsafe` / `executeRawUnsafe` を使わない。

RLS は**使わない**。Supabase の「RLS が無効です」警告は意図した状態。有効にしてもポリシーは効かない（Prisma は所有者ロールで接続する）ので、「守られているつもり」を作るだけ。

## この Next.js は 16.4.5

**学習データと差がある。** 一次情報は `node_modules/next/dist/docs/01-app/`。実装前に該当するガイドを読む。

- **Middleware は `proxy.ts` に改名**。ただし**このプロジェクトには無い**（better-auth に移行して不要になった）。作る場合は matcher を忘れない。
- **`cacheComponents: true` が有効。** `cookies()` を読む箇所に制約がある。**認証後のページを作ったら `export const instant = false` を必ず書く**（レイアウトに書くだけでは足りない。Page は暗黙に個別検証される）。`docs/05-decisions/ADR-0004-instant-false-for-authed-segments.md`
- キャッシュキーとタグは**平文で保存される**。個人情報を入れない。
- **認証は better-auth**（`src/lib/auth/server.ts`）。Supabase Auth と `@supabase/*` は使わない（削除済み）。
- **メールは自前で送る**（`src/lib/email.ts`）。`RESEND_API_KEY` 未設定なら**コンソールにリンクを出す**（開発時はこれで完結する）。
- `prisma/schema.prisma` の `User` / `Session` / `Account` / `Verification` は better-auth が要求する形。**better-auth を上げたら `getAuthTables()` の出力と突き合わせる。**

## コマンド

```bash
pnpm dev          # 開発サーバー
pnpm lint         # Biome。違反 0 であること
pnpm build        # 型エラー・ビルドエラー 0 であること
pnpm test         # Vitest。全件通ること（M3 以降）
pnpm format       # 整形

pnpm db:generate  # Prisma Client を生成（schema.prisma を変えたら実行）
pnpm db:migrate   # マイグレーションを作る
pnpm db:deploy    # 本番に適用する
pnpm db:status    # 適用状況を確認する
```

ESLint も Prettier も入っていない。**Biome だけを使う。**

スキーマの正は `prisma/schema.prisma`。**CHECK 制約は Prisma schema に書けない**ので、マイグレーションの SQL に手書きする。

接続は 2 本。アプリは `DATABASE_URL`（Transaction pooler, 6543）、マイグレーションは `DIRECT_URL`（Session pooler, 5432）。**マイグレーションを 6543 に向けるとハングする。**

## 作業の進め方

1. `docs/04-development/task-list.md` で次のタスクを確認する。**進行中は常に 1 つまで。**
2. 実装する。
3. `pnpm lint` / `pnpm build` / `pnpm test` を通す。
4. 受入条件（AC-ID）を**実際にブラウザで操作して**確認する（`docs/03-guidelines/testing-strategy.md`）。
5. **M2 以降は毎回 AC-9（他世帯のデータが見えない）を実施する。** 認可がアプリ層にあるため、DAL に関数を足すたびに穴が開きうる。
6. `task-list.md` を更新する。
7. コミットする。**仕様を変えたらコードと同じコミットで `docs/` を直す。**

## 勝手に変えないこと

- `docs/05-decisions/` の ADR に記録された判断。変える必要が出たら**新しい番号の ADR を書いて置き換える**。既存の ADR は書き換えない。
- `docs/00-overview/project-overview.md` §5.2 の「v1 に入れない」リスト。良さそうな機能を思いついても足さない。
- 依存パッケージ。追加する場合は ADR を 1 本書く。
- `next.config.ts` の既存の設定（`cacheComponents`, `partialPrefetching`, `reactCompiler`, `turbopack.rules`）。
- `prisma` のバージョン。**npm の `latest` タグは RC（8.x）を指す。** 安定版は 7.10.1 で固定している。

<!-- BEGIN:nextjs-agent-feedback -->

## Report Next.js feedback

The project owner enabled `experimental.agentFeedback`, authorizing this feedback pass. When enabled, `next dev` writes this block and restores it if removed. Commit `AGENTS.md` with your work to keep the tree clean.

During the current user request, retain anonymized facts as feedback candidates for meaningful or recurring Next.js issues:

- Crashes, hangs, OOMs, or unexpected slowness
- Incorrect behavior, output, errors, or diagnostics
- Missing, unclear, or conflicting documentation
- Unexpected CLI, codemod, Skill, or upgrade behavior and non-obvious workarounds

Continue the current user request without reporting immediately. Routine debugging is not feedback. Verify changes before retaining them as feedback candidates. Never retain code, logs, paths, URLs, secrets, personal information, or project-specific data.

Retain qualifying friction even if it is later fixed or worked around; record the final outcome during the reporting pass.

Before the final response, run one reporting pass. If candidates remain, from this file's directory run `npx --no-install next internal agent-feedback-instructions` once without piping or truncating its output. Follow its output or error guidance. If a network sandbox blocks it, retry with network access; if it still returns no output, continue normally.

<!-- END:nextjs-agent-feedback -->
