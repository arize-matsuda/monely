# タスクリスト

最終更新: 2026-11-07

**目的: 作業状態を管理する。** このファイルが「いま何をしているか」の唯一の正。作業を始めるとき・終えるときに必ず更新する。

マイルストーンの定義は [実装計画](./implementation-plan.md)。

---

## 更新ルール

| 場面 | やること |
| --- | --- |
| 作業を始めるとき | 対象タスクを「進行中」に移す（1 つだけ） |
| 作業を終えたとき | 「完了」に移し、日付を書く |
| 詰まったとき | 「ブロッカー」に移し、**何で詰まっているか**を書く |
| 新しくやることが見つかったとき | 該当マイルストーンの「未着手」に追加する |
| マイルストーンを終えたとき | 確認結果を記録する（下部のテンプレート） |

- **「進行中」は常に 1 つまで。** 並行して手を広げない。
- タスクは「何をすれば終わりか」が分かる粒度で書く。「UI を整える」ではなく「下部タブを追加する」。
- 完了したタスクは消さない。何をやったかの記録になる。

---

## 現在の状況

| | |
| --- | --- |
| **進行中のマイルストーン** | **M2（実装は完了。マジックリンクの実地確認が残り）** |
| **次にやること** | M2-15 実際にログインして AC-1 / AC-2 / AC-3 / AC-11 を確認（**手作業**。メール受信が必要） |
| **方針変更** | 2026-11-07 に認可を RLS からアプリ層に移した → [ADR-0005](../05-decisions/ADR-0005-authorization-in-app-layer.md) |
| **ブロッカー** | なし |

---

## 進行中

（なし）

---

## ブロッカー

（なし）

> 記録の書き方の例:
> - **M2-3 `proxy.ts` でセッション更新** — `setAll` の第 2 引数の型が合わない。`@supabase/ssr@0.12.7` の `types.d.ts` を確認中。（2026-11-xx）

---

## M0 — 土台の整備

**完了（2026-11-07）**

### 未着手

（なし）

### 完了

- [x] M0-1 スキャフォールドの残骸を削除（`src/app/page.tsx` の既定の中身、`public/*.svg` 5 件）（2026-11-07）
- [x] M0-2 `README.md` を Monely の内容に書き換える（`docs/` への導線を入れる）（2026-11-07）
- [x] M0-3 ルートレイアウトを整える（`lang="ja"`、メタデータ、日本語フォント、`viewport`）（2026-11-07）
- [x] M0-4 デザイントークンを `globals.css` に定義（ライト / ダーク）（2026-11-07）
- [x] M0-5 `.env.local.example` を作成（2026-11-07）
- [x] M0-6 `.gitignore` に `!.env.local.example` を追加（2026-11-07）
- [x] M0-7 `pnpm lint` / `pnpm build` を通す（2026-11-07）
- [x] M0-8 コミット（Supabase の依存追加分は `d4f30db` で別途コミット済み）（2026-11-07）

### M0 でやったことの補足

- フォントは `Geist`（英数字）＋ システムの日本語フォントのスタック。`Geist_Mono` は未使用のため読み込みをやめた。金額の桁揃えは Tailwind の `tabular-nums` を使う。
- `--accent` はダークモードでも同じ値（`#4f46e5`）を使う。near-black 上でも白文字が 6.2:1 を確保でき、ボタン自体も背景に対して 3:1 を満たすため。
- `instant = false` はルートレイアウトに置いていない（[ADR-0004](../05-decisions/ADR-0004-instant-false-for-authed-segments.md) のとおり、認証後の `(app)` レイアウトに置く）。
- `src/app/page.tsx` は土台確認用のプレースホルダ。**M2 で `src/app/(app)/page.tsx` を作るときに削除する**（同じ `/` に解決されるため共存できない）。
- `public/` は空になった。PWA アイコンを M5 で入れる。
- `next dev` が `AGENTS.md` に `nextjs-agent-feedback` ブロックを追記した（`experimental.agentFeedback` が有効なため）。追記分はそのままコミットしている。

## M1 — Supabase プロジェクトと DB スキーマ（Prisma）

> **2026-11-07 に方針変更。** 認可を RLS からアプリ層に移し、データアクセスを Prisma に寄せた（[ADR-0005](../05-decisions/ADR-0005-authorization-in-app-layer.md)）。RLS 前提で作った `supabase/migrations/0001_init.sql` と `supabase/verify/` は削除した。

### 未着手

（なし）

### 見送った判断

- **M1-14 DB パスワードのローテーション** — 開発者の判断で見送り（2026-11-08）。Prisma CLI は接続文字列をプロセス引数に平文で渡すため `ps` で見える。漏れた疑いが出たら Project Settings → Database から Reset database password を実行する。

### 完了

- [x] M1-1 Supabase に無料プロジェクトを作る（2026-11-07）
- [x] M1-2 Prisma を導入（`prisma@7.10.1`, `@prisma/client`, `@prisma/adapter-pg`, `pg`, `dotenv`, `@types/pg`）（2026-11-07）
- [x] M1-3 `prisma/schema.prisma` — 4 モデル（`Household` / `Profile` / `Category` / `Transaction`）+ `Kind` enum（2026-11-07）
- [x] M1-4 `prisma.config.ts` — `.env.local` を読む設定（2026-11-07）
- [x] M1-5 `prisma/migrations/0001_init/migration.sql` — `migrate diff` で生成し、CHECK 制約 5 件を手で追記（2026-11-07）
- [x] M1-6 `src/lib/data/db.ts` — Prisma Client の生成口（外から import 禁止）（2026-11-07）
- [x] M1-11 `.gitignore` / `biome.json` から生成物（`src/generated/`）を除外（2026-11-07）
- [x] M1-12 `package.json` に `db:*` スクリプトを追加（2026-11-07）
- [x] M1-13 旧 RLS 資産（`supabase/`）を削除（2026-11-07）
- [x] M1-7 `.env.local` に `DATABASE_URL`（6543）と `DIRECT_URL`（5432）を設定（2026-11-07）
- [x] M1-8 `pnpm db:deploy` で本番に適用（2026-11-07）
- [x] M1-10 本番スキーマの確認（テーブル 4、enum、CHECK 5 件、外部キー 6、インデックス、RLS 無効）（2026-11-07）
- [x] M1-15 アプリ実行時の接続経路を実機確認（Transaction pooler + driver adapter で `$transaction` まで動作）（2026-11-07）
- [x] M1-9 Redirect URLs を登録（2026-11-08）
- [x] M1-16 Supabase Auth の環境変数を設定（2026-11-08。`.supabase.com` → `.supabase.co` の誤りを修正）
- [x] M1-17 **PostgREST の公開を塞ぐ**（`0002_revoke_postgrest_access`）（2026-11-08）

### M1 で見つけて直した不具合（2）

**Publishable key だけで全テーブルが読み書きできる状態だった。**

Supabase は DB の上に PostgREST（`/rest/v1/...`）を自動で立てる。これは `anon` / `authenticated` ロールで動き、ブラウザに埋め込まれる Publishable key だけで叩ける。RLS を外したため行を絞る仕組みが無く、さらに Supabase の既定権限が新規テーブルに `anon` へ `ALL` を付けるため、公開状態になっていた。

実測（2026-11-08、修正前）:

| 操作 | 結果 |
| --- | --- |
| `GET /rest/v1/transactions` | **200**（全世帯の記録が読める） |
| `POST /rest/v1/households` | **23514**（CHECK 制約まで到達 = 権限はある） |
| `DELETE /rest/v1/transactions?id=eq..` | **204**（削除できる） |

修正: `prisma/migrations/0002_revoke_postgrest_access` で `anon` / `authenticated` から `public` の権限を剥奪し、既定権限も打ち消した。適用後は全操作が **401 / 42501** になった。将来のテーブルにも権限が付かないことを、実際にテーブルを作って確認した。

> **先日の TRUNCATE の穴と同じ根本原因**（Supabase の既定権限）。RLS を外したことで現れ方が変わっただけ。テーブルを足したら毎回 REST API を叩いて確認する運用にした。

`revoke usage on schema public` は効かなかった（`USAGE` は `PUBLIC` 疑似ロール経由で付与されているため）。実際に防いでいるのはテーブル権限の剥奪。マイグレーション 0002 のコメントはこの点を過大に書いているが、**適用済みマイグレーションは Prisma がチェックサムを検証するため編集できない**ので、ドキュメント側で補足した。

### 方針変更でやったこと

- **ADR**: ADR-0005 を追加。ADR-0002 を Superseded に。ADR-0001 / ADR-0003 に注記
- **ドキュメント**: DB設計・セキュリティガイドライン・テスト戦略を全面的に書き直し、アーキテクチャ・API設計・コーディング規約・用語集・機能要件・非機能要件・実装計画を更新
- **撤回した判断**: 「v1 ではテストを入れない」（[ADR-0001](../05-decisions/ADR-0001-tech-stack.md)）。認可の書き忘れを検出する工程が他に無いため、M3 で Vitest を導入する

### Prisma のセットアップで分かったこと

| 事項 | 内容 |
| --- | --- |
| **マイグレーションは Transaction pooler（6543）では通らない** | 4 分待っても応答が返らずハングした。DDL とアドバイザリロックを使うため。`prisma.config.ts` は CLI 専用なので、`datasource.url` に `DIRECT_URL`（5432）を入れて解決 |
| **アプリ側は Transaction pooler で問題なく動く** | driver adapter（`pg`）経由で、単純クエリ・`include`・**`$transaction`**・CHECK 制約の拒否がすべて動作した |
| **Prisma CLI はパスワードをプロセス引数に渡す** | `ps` で平文で見える。Prisma の実装に由来し回避できない。画面共有やログで漏れやすい |
| `_` 始まりのディレクトリは Next.js のルーティング対象外 | 検証用に `src/app/_check/` を作ったら 404。private folder の規則 |
| `pg` の `ssl: true` は失敗する | Supabase のプーラー証明書が自己署名チェーン（`SELF_SIGNED_CERT_IN_CHAIN`）。Prisma は自前で扱うので実害なし |
| npm の `latest` が RC を指している | Prisma の `latest` タグが `8.0.0-rc.33`。安定版の最新は **7.10.1**。`prisma@7.10.1` に固定した |
| pnpm のビルドスクリプト許可が必要 | `pnpm-workspace.yaml` の `allowBuilds` に `@prisma/engines` と `prisma` を追加。許可しないとエンジンが落ちてこない |
| Prisma 7 は driver adapter 必須 | `@prisma/adapter-pg` + `pg`。`new PrismaClient({ adapter })` の形 |
| Prisma 7 は `.env` を自動で読まない | `prisma.config.ts` で `dotenv` を使い、`.env.local` を明示的に読む |
| `migrate diff` のフラグ | `--to-schema`（`--to-schema-datamodel` は 6 系） |
| CHECK 制約が書けない | マイグレーションの SQL に手書き。5 件追記した |
| Node 26 への警告 | 「Node.js 20.19+, 22.12+, 24.0+ のみ対応」と出るが、7.10.1 は Node 26.13.0 で動作する |

### 適用済みマイグレーション

適用状況は Supabase 側の `_prisma_migrations` テーブルが記録する。`pnpm db:status` で確認する。

| ファイル | 状態 |
| --- | --- |
| `0001_init` | 適用済み（2026-11-07） |
| `0002_revoke_postgrest_access` | 適用済み（2026-11-08） |

**適用済みのマイグレーション SQL は編集しない。** Prisma がチェックサムを検証するため、編集すると `migrate deploy` が失敗する。

## M2 — 認証と世帯

実装は完了。**マジックリンクの実地確認（メール受信を伴う）が残り。**

### 未着手

- [ ] M2-15 実際にログインして受入条件を確認（**手作業**）
  - [ ] AC-1 マジックリンクでログインできる。閉じて開き直してもログインしたまま
  - [ ] AC-2 `/setup` で世帯を作れて、初期カテゴリ 18 件が入る
  - [ ] AC-3 2 つ目のアカウントが招待コードで同じ世帯に参加できる
  - [ ] AC-11 世帯未所属で `/`、`/setup` 以外を開くと `/setup` に飛ぶ
- [ ] M2-16 [認可の確認](../03-guidelines/testing-strategy.md#42-認可の確認毎回実施)（AC-9）。別世帯を作って実施
- [ ] M2-17 `pnpm lint` / `pnpm build` を通してコミット（実装分はコミット済み）

### 完了

- [x] M2-1 `src/lib/supabase/env.ts`（環境変数の読み取り）（2026-11-08）
- [x] M2-2 `src/lib/supabase/server.ts` / `client.ts`（**認証のみに使う**）（2026-11-08）
- [x] M2-3 `src/proxy.ts`（セッション更新。`setAll` の第 2 引数のヘッダを設定、matcher で静的ファイルを除外）（2026-11-08）
- [x] M2-4 `src/lib/types.ts`（`Me`, `Member`, `ActionResult`, `ok` / `fail` / `failUnexpected`）（2026-11-08）
- [x] M2-5 `src/lib/auth.ts`（`getMe` / `requireUser` / `requireMember`）+ `src/lib/data/profile.ts`（初回ログイン時に `Profile` を作る）（2026-11-08）
- [x] M2-6 `src/lib/validation.ts`（テキスト・メール・招待コード・金額。**全角数字の正規化を含む**）（2026-11-08）
- [x] M2-7 `/login` 画面（**公開ページなので静的シェルを保つ**）（2026-11-08）
- [x] M2-8 `sendMagicLink` アクション（登録有無を漏らさない）（2026-11-08）
- [x] M2-9 `/auth/callback` Route Handler（`exchangeCodeForSession` → 振り分け、失敗時は `/login?error=1`）（2026-11-08）
- [x] M2-10 `/setup` 画面（世帯を作る / 招待コードで参加する）（2026-11-08）
- [x] M2-11 `createHousehold` / `joinHousehold` アクション + DAL（`$transaction` で世帯作成 + 初期カテゴリ 18 件 + 所属更新）（2026-11-08）
- [x] M2-12 `(app)/layout.tsx`（振り分け + `export const instant = false`）（2026-11-08）
- [x] M2-13 `signOut` アクション（2026-11-08）
- [x] M2-14 仮のホーム画面（世帯名・招待コード・メンバー・ログアウト）（2026-11-08）
- [x] M2-18 `src/app/page.tsx` を削除（`(app)/page.tsx` に置き換え）（2026-11-08）
- [x] M2-19 UI の下地（`components/ui/button.tsx`, `field.tsx`）（2026-11-08）

### M2 で分かったこと

| 事項 | 内容 |
| --- | --- |
| **公開ページは `instant = false` にしない方がよい** | `/login` は `searchParams`（`?error=1`）を読むため最初はビルドが落ちた。`instant = false` で逃げる代わりに、エラー通知だけを `<Suspense>` に入れた。結果 `/login` は **Partial Prerender**（静的シェル + ストリーミング）になり、公開ページとして望ましい形になった |
| `searchParams` は await せず子に渡す | ページ本体を `async` にせず、`searchParams` の Promise を `<Suspense>` 内の子コンポーネントに渡して、そこで await する |
| **`Profile` は `onDelete: SetNull` なので世帯を消しても残る** | 接続確認で作ったプロフィールが本番 DB に残っていた。削除済み。**検証データは世帯だけ消しても片付かない**（NFR-O3） |
| `matcher` 無しの Proxy は静的ファイルにも走る | `_next` と拡張子付きファイルを除外する正規表現を書いた |
| Proxy は Node.js ランタイム既定（Next 16） | `runtime` の指定はできない（指定するとエラー） |

### 設計上の例外を 1 つ作った

`src/lib/data/profile.ts` の `findOrCreateProfile(userId, email)` は、**ADR-0005 約束 B（世帯 ID を引数で受け取らない）の唯一の例外**。身元を確立するブートストラップなので、`requireMember()` から世帯 ID を得ることができない（循環する）。

安全である理由をファイル内のコメントに明記した。
- 渡される `userId` は `supabase.auth.getUser()` がサーバー側で検証した値だけ
- `userId` に一致する 1 行しか読まない／作らない
- 他のテーブルには一切触れない

## M3 — 記録と一覧（v1 の本体）

### 未着手

- [ ] M3-0 **Vitest とローカル DB の用意**（`vitest.config.ts`, `scripts/test-db.sh`, `.env.test`）— ADR-0005 約束 C
- [ ] M3-1 `src/lib/money.ts`（`formatYen`, `parseAmount`, `summarize`）＋ テスト
- [ ] M3-2 `src/lib/month.ts`（`monthRange`, `prevMonth`, `nextMonth`, `formatMonth`, `formatDateLabel`）＋ テスト（**UTC での整形**）
- [ ] M3-3 `src/lib/data/transactions.ts`（`listTransactionsByMonth`, `getTransaction`, `listCategories`）＋ **認可テスト**
- [ ] M3-4 `src/lib/data/household.ts`（`listMembers`, `getHousehold`）＋ **認可テスト**
- [ ] M3-5 ホーム画面 — 月切り替え（`?m=` の読み取り、不正値の扱い）
- [ ] M3-6 ホーム画面 — 月次合計の表示
- [ ] M3-7 ホーム画面 — 日付グループ化した一覧
- [ ] M3-8 ホーム画面 — 空表示
- [ ] M3-9 `createTransaction` アクション（検証・**参照先の所属確認**・INSERT）
- [ ] M3-10 `/new` — 種別タブ、金額入力（Client Component）
- [ ] M3-11 `/new` — カテゴリ選択
- [ ] M3-12 `/new` — 折りたたみ項目（日付・支払った人・メモ）
- [ ] M3-13 `updateTransaction` / `deleteTransaction` アクション + DAL（`updateMany` / `deleteMany`）＋ **認可テスト**
- [ ] M3-14 `/transactions/[id]` — 編集フォーム
- [ ] M3-15 `/transactions/[id]` — 削除（確認付き）、見つからない表示
- [ ] M3-16 エラー表示（入力エラー・保存失敗で入力が消えないこと）
- [ ] M3-17 受入条件 AC-4〜AC-8 を実施
- [ ] M3-18 **受入条件 AC-9 を再実施**
- [ ] M3-19 [テスト戦略 §4.3](../03-guidelines/testing-strategy.md#44-金額と日付の確認m3)（金額と日付の確認。**全角数字を含む**）
- [ ] M3-20 入力速度の計測（10 秒 / 5 タップ以内）
- [ ] M3-21 `pnpm lint` / `pnpm build` / **`pnpm test`** を通してコミット
- [ ] **M3-22 v1 完成の確認。使い始める**

### 完了

（なし）

---

## M4 — スマホ UI の仕上げ

### 未着手

- [ ] M4-1 下部タブ（セーフエリア対応）
- [ ] M4-2 `/settings` — 世帯名の変更
- [ ] M4-3 `/settings` — 招待コードの表示
- [ ] M4-4 `/settings` — メンバー一覧
- [ ] M4-5 `/settings` — 表示名の変更
- [ ] M4-6 `/settings` — ログアウト
- [ ] M4-7 カテゴリ管理（追加・改名・非表示）
- [ ] M4-8 カテゴリの並びを直近 30 日の使用頻度順に
- [ ] M4-9 日付の「今日 / 昨日」ショートカット
- [ ] M4-10 タップ領域・コントラスト・フォーカス表示の調整
- [ ] M4-11 保存中の状態表示
- [ ] M4-12 受入条件 AC-10, AC-12 を実施
- [ ] M4-13 実機（iPhone）での確認
- [ ] M4-14 **受入条件 AC-9 を再実施**
- [ ] M4-15 `pnpm lint` / `pnpm build` を通してコミット

### 完了

（なし）

---

## M5 — PWA 化

### 未着手

- [ ] M5-1 **デプロイ先を決める**（未確定事項 #1）
- [ ] M5-2 デプロイする
- [ ] M5-3 Supabase の Redirect URLs に本番 URL を追加
- [ ] M5-4 アイコンを作る（192 / 512 / maskable / apple-touch-icon）
- [ ] M5-5 `src/app/manifest.ts`
- [ ] M5-6 `theme-color` と `viewport` の調整
- [ ] M5-7 スマホでホーム画面に追加して全画面起動を確認
- [ ] M5-8 `pnpm lint` / `pnpm build` を通してコミット

### 完了

（なし）

---

## 未確定事項

| # | 内容 | 判断の期限 | 状態 |
| --- | --- | --- | --- |
| 1 | デプロイ先（Vercel / 自前サーバー） | M5 の着手前 | **未決** |
| 2 | PWA アイコンのデザイン | M5 | 未決 |
| 3 | v2 で最初に作る機能（内訳 or 予算） | v1 を 1 か月使ってから | 未決 |

---

## v1 完成後にやること

v1 を 1 か月使ってから判断する。候補は [プロダクト要件 §5](../01-requirements/product-requirements.md#5-v2-以降の候補)。

- [ ] 1 か月使って、困ったことを書き出す
- [ ] 記録の継続率を確認する（週 5 日以上記録できているか）
- [ ] v2 の最初の機能を決める

---

## 確認結果の記録

マイルストーン完了時にここへ追記する（新しいものを上に）。

### M1 確認結果（2026-11-07）

- `pnpm lint`: OK / `pnpm build`: OK（型エラー 0）
- `pnpm db:deploy`: OK（`0001_init` 適用済み）
- `pnpm db:status`: 「Database schema is up to date!」
- 本番スキーマ: テーブル 4 + `_prisma_migrations` / `kind` enum / **CHECK 制約 5 件** / 外部キー 6 / インデックス 10 / **RLS はすべて false（意図どおり）**
- アプリ実行時の経路（Next.js → driver adapter → Transaction pooler 6543）:
  - 単純クエリ OK / `include` でリレーション取得 OK / **`$transaction` OK** / CHECK 制約の拒否 OK / cascade delete OK
  - `occurredOn` は `2026-11-07T00:00:00.000Z`。JST では UTC 整形とローカル整形がどちらも「11月7日」になる（**負のオフセット環境なら前日になる。UTC 固定が必要**）
- 残課題: なし

### M2 確認結果（2026-11-08、実装分のみ）

- `pnpm lint`: OK / `pnpm build`: OK
- ルートの種別: `/` と `/setup` と `/auth/callback` が Dynamic、`/login` が **Partial Prerender**、Proxy が登録済み
- 未ログインでのガード: `/` → 307 `/login`、`/setup` → 307 `/login`
- `/auth/callback`（code 無し）→ 307 `/login?error=1`
- `/login` の表示: title・ラベル・送信ボタン・説明文すべて出力。`?error=1` のときだけエラー通知が出る
- 未ログインでプロフィールが作られないことを確認（DB は空）
- **未確認**: マジックリンクの実地確認（メール受信が必要）、AC-9

### M1 追加確認（2026-11-08）

- `.env.local`: 4 変数すべて設定済み（`NEXT_PUBLIC_SUPABASE_URL` の `.supabase.com` → `.supabase.co` を修正）
- Supabase Auth: `/auth/v1/settings` HTTP 200、新規登録 有効、`mailer_autoconfirm: false`（マジックリンクが機能する）、email プロバイダ 有効
- `pnpm db:deploy`: `0002_revoke_postgrest_access` を適用
- **PostgREST の遮断**: Publishable key での 4 テーブルの読み取り・INSERT・DELETE がすべて **401 / 42501**
- `anon` / `authenticated` の `public` テーブル権限: **0 件**
- 将来のテーブル: 実際に作成して `anon` / `authenticated` に権限が付かないことを確認
- Prisma（postgres ロール）: `DATABASE_URL` / `DIRECT_URL` の両方で読み取り可能（影響なし）
- Redirect URLs: 登録済み（公開 API からは読めないため、M2 のログインで実地確認する）

### M0 確認結果（2026-11-07）

- `pnpm lint`: OK（Biome 違反 0。`pnpm format` で 2 ファイル整形後）
- `pnpm build`: OK（型エラー 0、警告なし。`/` と `/_not-found` が Static）
- `pnpm dev` での表示: OK（HTTP 200、`lang="ja"`、`theme-color` のライト / ダーク両方が出力されている）
- デザイントークン: OK（コンパイル後の CSS に `:root` とダークモードの両ブロックが生成され、`text-income` などのユーティリティが CSS 変数を参照している）
- `.env.local.example`: OK（`.gitignore` の `.env*` に負けず追跡できる）
- **未確認**: ブラウザでの見た目（配色・余白）の目視確認。HTML と CSS の出力までは確認済み
- 残課題: なし

> 記録のテンプレート
> ```markdown
> ### Mx 確認結果（YYYY-MM-DD）
> - pnpm lint: OK
> - pnpm build: OK
> - AC-x: OK
> - 残課題: なし
> ```
