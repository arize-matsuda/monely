<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

# Monely

スマホで数秒で記録できて、家族と同じ家計簿を見られる、自作の家計管理アプリ。
Next.js 16（App Router）+ Supabase（PostgreSQL + Auth）+ Tailwind CSS v4 + Biome / pnpm。

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

1. **`service_role` キーを使わない。** RLS を完全にバイパスする。公開キー（`NEXT_PUBLIC_SUPABASE_ANON_KEY`）だけを使う。
2. **認可の本体は PostgreSQL の RLS。** アプリのクエリに書く `household_id` の条件はセキュリティではない（`docs/05-decisions/ADR-0002-authorization-via-rls.md`）。
3. **すべての Server Action の 1 行目で認証と世帯を取得する。** Server Action は UI を経由せず直接 POST できる。
4. **`household_id` と `created_by` をクライアントから受け取らない。** サーバー側で `auth.uid()` から引いた値を使う。
5. **`getSession()` を認可の判断に使わない。** `getUser()` を使う。
6. **テーブルを作ったらその場で RLS を有効にする。** ポリシーには `to authenticated` を付ける。
7. **金額は整数（円）。** 浮動小数点の演算を使わない。日付は `date` 型 / `"YYYY-MM-DD"` 文字列で、時刻を持たせない。
8. **`any` を使わない。**

## この Next.js は 16.4.5

**学習データと差がある。** 一次情報は `node_modules/next/dist/docs/01-app/`。実装前に該当するガイドを読む。

- **Middleware は `proxy.ts` に改名**（`src/proxy.ts`）。トークン更新のみ。認可判断を置かない。
- **`cacheComponents: true` が有効。** `cookies()` を読む箇所に制約がある。認証後のセグメントは `export const instant = false`（`docs/05-decisions/ADR-0004-instant-false-for-authed-segments.md`）。
- キャッシュキーとタグは**平文で保存される**。個人情報を入れない。
- `@supabase/ssr@0.12.7` の `setAll(cookiesToSet, headers)` は**第 2 引数のヘッダもレスポンスに設定する**（忘れると他人のセッションがキャッシュから配信されうる）。

## コマンド

```bash
pnpm dev      # 開発サーバー
pnpm lint     # Biome。違反 0 であること
pnpm build    # 型エラー・ビルドエラー 0 であること
pnpm format   # 整形
```

ESLint も Prettier も入っていない。**Biome だけを使う。**

## 作業の進め方

1. `docs/04-development/task-list.md` で次のタスクを確認する。**進行中は常に 1 つまで。**
2. 実装する。
3. `pnpm lint` と `pnpm build` を通す。
4. 受入条件（AC-ID）を**実際にブラウザで操作して**確認する（`docs/03-guidelines/testing-strategy.md`）。
5. **M2 以降は毎回 AC-9（他世帯のデータが見えない）を実施する。**
6. `task-list.md` を更新する。
7. コミットする。**仕様を変えたらコードと同じコミットで `docs/` を直す。**

## 勝手に変えないこと

- `docs/05-decisions/` の ADR に記録された判断。変える必要が出たら**新しい番号の ADR を書いて置き換える**。既存の ADR は書き換えない。
- `docs/00-overview/project-overview.md` §5.2 の「v1 に入れない」リスト。良さそうな機能を思いついても足さない。
- 依存パッケージ。追加する場合は ADR を 1 本書く。
- `next.config.ts` の既存の設定（`cacheComponents`, `partialPrefetching`, `reactCompiler`, `turbopack.rules`）。

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
