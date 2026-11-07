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
| DB | Supabase（PostgreSQL のみ） |
| 認証 | better-auth 1.7.18 |
| データアクセス | Prisma 7（スキーマ・マイグレーション・クエリ） |
| 認可 | **アプリ層**（`src/lib/data/`） |
| Lint / Format | Biome |
| テスト | Vitest（M3 で導入） |
| パッケージ管理 | pnpm |

選定理由 → [ADR-0001](./docs/05-decisions/ADR-0001-tech-stack.md) / [ADR-0005](./docs/05-decisions/ADR-0005-authorization-in-app-layer.md)

> **認可はアプリ層にある。** DB の RLS は使わない。Supabase ダッシュボードに出る「RLS が無効です」警告は**意図した状態**（[ADR-0005](./docs/05-decisions/ADR-0005-authorization-in-app-layer.md)）。
>
> そのため **`src/lib/data/` の `where` が唯一の砦**。`prisma` をそこ以外から import しない。詳細 → [セキュリティガイドライン](./docs/03-guidelines/security-guidelines.md)

> **この Next.js は 16.4.5 で、一般的な記事と差がある。** `cacheComponents` が有効で、`cookies()` を読む箇所に制約がある。一次情報は `node_modules/next/dist/docs/`。

## セットアップ

```bash
pnpm install
cp .env.local.example .env.local   # 値は Supabase の設定からコピーする
pnpm dev                           # http://localhost:3000
```

`.env.local` の値は **M1（Supabase プロジェクトの作成）** で揃う。それまでは画面の表示確認のみ可能。

### Supabase 側の準備（M1）

1. Supabase で無料プロジェクトを作る
2. Project Settings → **Connect** から接続文字列を 2 本取り、`.env.local` に設定する
   - `DATABASE_URL` … **Transaction pooler**（ポート 6543）
   - `DIRECT_URL` … **Session pooler**（ポート 5432）
3. `BETTER_AUTH_SECRET` を生成して `.env.local` に設定する
   ```bash
   node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
   ```
4. `pnpm db:deploy` でスキーマを適用する

| 変数 | 用途 | 注意 |
| --- | --- | --- |
| `DATABASE_URL` | アプリのクエリ（6543） | **DB の全権を持つ。`NEXT_PUBLIC_` を付けない** |
| `DIRECT_URL` | マイグレーション（5432） | 同上。**6543 に向けるとマイグレーションがハングする** |
| `BETTER_AUTH_SECRET` | セッションの署名鍵 | **漏れるとセッションを偽造できる** |
| `BETTER_AUTH_URL` | アプリの URL | 既定 `http://localhost:3000` |
| `RESEND_API_KEY` / `MAIL_FROM` | メール送信 | **未設定なら開発モード（確認リンクをコンソールに出力）** |

**認証は Supabase Auth を使いません**（better-auth に移行）。Supabase の API キーは不要です。

## コマンド

```bash
pnpm dev          # 開発サーバー
pnpm lint         # Biome（違反 0 であること）
pnpm build        # 本番ビルド（型エラー 0 であること）
pnpm format       # 整形

pnpm db:generate  # Prisma Client を生成（スキーマを変えたら実行）
pnpm db:migrate   # マイグレーションを作る
pnpm db:deploy    # 本番に適用する
pnpm db:status    # 適用状況を確認する
pnpm db:studio    # データを覗く
```

ESLint も Prettier も入っていない。**Biome だけを使う。**

## 現在の状態

| マイルストーン | 内容 | 状態 |
| --- | --- | --- |
| M0 | 土台の整備 | 完了 |
| M1 | Supabase プロジェクトと DB スキーマ（Prisma） | 完了 |
| M2 | 認証と世帯 | 完了 |
| M3 | 記録と一覧（**ここで v1 完成**） | 次 |
| M4 | スマホ UI の仕上げ | 未着手 |
| M5 | PWA 化 | 未着手 |

詳細は [タスクリスト](./docs/04-development/task-list.md)。
