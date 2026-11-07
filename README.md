# Monely

> スマホで数秒で記録できて、家族と同じ家計簿を見られる、自作の家計管理アプリ。

既存の家計簿アプリが「入力が面倒」「家族の支出が見えない」「機能が多すぎる」で続かなかったので、記録と一覧だけに絞って自作している。

## ドキュメント

**設計の「正」は [`docs/`](./docs) にある。実装の前に読む。**

| | |
| --- | --- |
| [docs/README.md](./docs/README.md) | 全ドキュメントの索引 |
| [プロジェクト概要](./docs/00-overview/project-overview.md) | 何を作るのか、**何を作らないのか** |
| [タスクリスト](./docs/04-development/task-list.md) | いま何をすべきか |
| [実装計画](./docs/04-development/implementation-plan.md) | マイルストーン M0〜M5 |
| [設計判断（ADR）](./docs/05-decisions) | **勝手に変えない判断の記録** |

AI エージェントで作業する場合は [`AGENTS.md`](./AGENTS.md) を参照（`CLAUDE.md` はこれを読み込むだけ）。

## 技術スタック

| 層 | 選定 |
| --- | --- |
| フレームワーク | Next.js 16.4.5（App Router） |
| UI | React 19 + Tailwind CSS v4 |
| DB・認証 | Supabase（PostgreSQL + Supabase Auth） |
| 認可 | PostgreSQL の RLS（行レベルセキュリティ） |
| Lint / Format | Biome |
| パッケージ管理 | pnpm |

選定理由 → [ADR-0001](./docs/05-decisions/ADR-0001-tech-stack.md)

> **この Next.js は 16.4.5 で、一般的な記事と差がある。** Middleware は `proxy.ts` に改名され、`cacheComponents` が有効。一次情報は `node_modules/next/dist/docs/`。

## セットアップ

```bash
pnpm install
cp .env.local.example .env.local   # 値は Supabase の設定からコピーする
pnpm dev                           # http://localhost:3000
```

`.env.local` の値は **M1（Supabase プロジェクトの作成）** で揃う。それまでは画面の表示確認のみ可能。

### Supabase 側の準備（M1）

1. Supabase で無料プロジェクトを作る
2. `supabase/migrations/0001_init.sql` を SQL Editor に貼って実行する
3. Authentication → URL Configuration の Redirect URLs に `http://localhost:3000/auth/callback` を登録する
4. Project Settings → API の URL と公開キー（anon / publishable）を `.env.local` に設定する

**`service_role` キーは使わない。** → [ADR-0002](./docs/05-decisions/ADR-0002-authorization-via-rls.md)

## コマンド

```bash
pnpm dev      # 開発サーバー
pnpm lint     # Biome（違反 0 であること）
pnpm build    # 本番ビルド（型エラー 0 であること）
pnpm format   # 整形
```

ESLint も Prettier も入っていない。**Biome だけを使う。**

## 現在の状態

| マイルストーン | 内容 | 状態 |
| --- | --- | --- |
| M0 | 土台の整備 | 進行中 |
| M1 | Supabase プロジェクトと DB スキーマ | 未着手 |
| M2 | 認証と世帯 | 未着手 |
| M3 | 記録と一覧（**ここで v1 完成**） | 未着手 |
| M4 | スマホ UI の仕上げ | 未着手 |
| M5 | PWA 化 | 未着手 |

詳細は [タスクリスト](./docs/04-development/task-list.md)。
