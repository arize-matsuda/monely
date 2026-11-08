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
| **進行中のマイルストーン** | **M4（スマホ UI の仕上げ）**。M3 = v1 は 2026-11-08 に完了 |
| **次にやること** | 画面確認（手作業）→ M5-1 デプロイ先の決定 |
| **UI の満足度** | 2026-11-08 shadcn 化後も「まだ良いとは思えない」との評価。**PC はスマホと別のレイアウトにしたい**（サイドバー、図）という要望あり |
| **方針変更** | 2026-11-07 認可をアプリ層へ（[ADR-0005](../05-decisions/ADR-0005-authorization-in-app-layer.md)）/ 2026-11-08 認証をメール+パスワードへ（[ADR-0006](../05-decisions/ADR-0006-email-password-auth.md)）/ 同日 認証基盤を better-auth へ（[ADR-0007](../05-decisions/ADR-0007-better-auth.md)）/ 同日 UI に shadcn/ui を採用（[ADR-0008](../05-decisions/ADR-0008-shadcn-ui.md)） |
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
| `0003_better_auth` | 適用済み（2026-11-08） |

**適用済みのマイグレーション SQL は編集しない。** Prisma がチェックサムを検証するため、編集すると `migrate deploy` が失敗する。

## M2 — 認証と世帯

**完了（2026-11-08）**

### 未着手（M2 のスコープ外に送った）

- [ ] AC-3 家族が招待コードで参加できる — **2 つ目のメールアドレスが必要**。家族を招待するタイミングで実施
- [ ] AC-9 他世帯のデータが見えない — **M3 に送る**。現時点では取引が 0 件なので「漏れるデータ」が存在せず、確認が空振りになる。[ADR-0005 約束 C](../05-decisions/ADR-0005-authorization-in-app-layer.md) の DAL 認可テスト（M3-0, M3-3）が本来の受け皿

### 完了した受入条件

| 条件 | 結果 |
| --- | --- |
| AC-1 新規登録 → 確認 → パスワードでログイン | **OK**（2026-11-08） |
| AC-2 世帯を作れて初期カテゴリ 18 件が入る | **OK**（支出 13 / 収入 5） |
| AC-11 未ログインのガード | **OK**（`/` と `/setup` が 307 で `/login` へ） |

### M2 で認証基盤を差し替えた（2 回目の方針変更）

開発者から「認証を自前でやりたい、Auth.js で」という要望。調査の結果**Auth.js は噛み合わない**と分かり、事実を提示したうえで **better-auth** を採用した（[ADR-0007](../05-decisions/ADR-0007-better-auth.md)）。

| ライブラリ | 週間DL | 状態 |
| --- | --- | --- |
| **better-auth** | 18,714,403 | 1.7.18 安定。Prisma 7 を名指しサポート |
| next-auth / Auth.js | 9,403,576 | **v5 が 2023-10 から 3 年以上 beta。** メール+パスワードを公式非推奨 |
| lucia | 694,830 | **非推奨** |

**認証方式の決定（ADR-0006）は変えていない。** 実装基盤だけ差し替えた。画面（`/login`, `/signup`, `/login/link`, `/settings`）はそのまま使えた。

変わったもの:

| | 変更前 | 変更後 |
| --- | --- | --- |
| 認証 | Supabase Auth | better-auth 1.7.18 |
| ユーザーの保存先 | `auth.users`（Prisma 管理外） | `user` / `session` / `account` / `verification`（Prisma 管理） |
| セッション | JWT + 毎リクエストの HTTP 往復 | DB セッション（同じ DB の 1 クエリ） |
| メール送信 | Supabase の組み込み SMTP | 自前（`src/lib/email.ts`） |
| `Profile.userId` | `uuid`、外部キーなし | `text`、**`user` への外部キーあり** |
| 削除したもの | — | `@supabase/*` 2 つ、`src/lib/supabase/`、`src/proxy.ts`、`/auth/callback` |

**開発時はメールのリンクがコンソールに出る。** 今日は送信制限で何度も止まったので、これが一番効く変更。

#### 作業で分かったこと

| 事項 | 内容 |
| --- | --- |
| `@better-auth/cli` は本体より古い | CLI 1.4.21 / 本体 1.7.18。**CLI を使わず `getAuthTables()` でインストール済みバージョンのスキーマ定義を直接取り出した** |
| Prisma 7 の `migrate diff` のフラグ | `--from-url` は無い。`--from-config-datasource`（設定の接続先＝本番）を使う |
| `--from-migrations` にはシャドー DB が必要 | 本番との差分を取る `--from-config-datasource` に切り替えて回避 |
| `migration_lock.toml` が必要 | 手でマイグレーションを作ったので無かった。`provider = "postgresql"` を書いて作成 |
| `nextCookies()` はプラグインの最後 | better-auth の作法。並び順が意味を持つ |
| **破壊的マイグレーションは自動モードが止める** | `DELETE FROM` を含むため適用がブロックされた。**妥当な挙動**なので開発者が実行する |

### M2 で見つけて直した不具合（2）

**確認リンクが見つけられなかった。** 原因は 2 つあり、どちらも私の作りが悪かった。

| # | 原因 | 直したこと |
| --- | --- | --- |
| 1 | **私がバックグラウンドで起動した dev サーバーが出力を奪っていた。** 開発者のターミナルには何も出ず、リンクは私のログファイルに出ていた | バックグラウンドの dev サーバーを停止。**今後は開発者自身が `pnpm dev` を実行する** |
| 2 | **メール本文でリンクの後ろに文章が続いていた。** ターミナルからコピーすると後続の文字まで入り、better-auth が `Invalid callbackURL: /\n\nこのリンクは…` で弾いた | 開発モードの出力を**リンクが最後の 1 行**になる形に変更。あわせて `.dev-mail.log` にも書き、標準出力がどこへ行っても取り出せるようにした |

`trustedOrigins: [baseURL]` も明示した（callbackURL の検証を自分のオリジンに限る）。

**教訓**: 開発者が見る出力を、こちらのバックグラウンドプロセスに握らせてはいけない。長時間動かす必要があるものは開発者自身に起動してもらう。

#### 確認メールの再送手段が無かった

最初のリンクを逃すと入れなくなる状態だった。`emailVerification.sendOnSignIn: true` を設定し（ログイン試行時に自動再送）、`/login/verify`（メールアドレスだけで再送）も用意した。

**開発環境ではメールは送られない。** `RESEND_API_KEY` が未設定なら、リンクは dev サーバーのターミナルと `.dev-mail.log` に出る。これは意図した設計だが、説明不足で開発者を待たせた。

### M2 で見つけて直した不具合

**「アカウントを作る」を実行してもメールが届かなかった。**

原因は**既に同じメールアドレスのアカウントが存在していた**こと。Supabase は既存の確認済みアドレスに対して**何も送らずに成功を返す**（アカウントの存在を漏らさないため）。こちらも表示を変えない実装にしていたため、「確認メールを送りました」と出たまま永遠に届かない状態になっていた。

`auth.users` が 1 件のままで `confirmation_sent_at` が初回から更新されていないことで確定した。

直したこと:

| # | 内容 |
| --- | --- |
| 1 | `/signup` に「すでに登録済みの場合は確認メールは届きません」の案内を常時表示（誰にでも同じ文なので存在は漏れない） |
| 2 | **メールの送信制限（`over_email_send_rate_limit`）は表示する**ようにした。これも握りつぶしていたため、同じ「黙って失敗」になりうる |
| 3 | `/settings` を作り、**パスワードの変更**（FR-A10）を M4 から前倒しした。マジックリンクで作った既存アカウントにパスワードを設定する手段が無かったため |

**教訓**: 存在を隠すためにエラーを握りつぶすと、利用者からは「黙って失敗」と区別できない。握りつぶす対象は「登録済み／未登録の区別がつく情報」だけに限る。

### もう 1 つ直した不具合

**`Date.now()` のプリレンダリング警告**が dev のログに出ていた（`AppLayout` と `SetupPage`）。supabase-js がトークンの期限判定で `Date.now()` を読むため、`cacheComponents` 有効下で「プリレンダリング中の不安定な値」として警告される。

`getMe()` の先頭に `await connection()` を置いてリクエスト時評価を明示し、解消した（Next.js の推奨どおり）。ビルドは元から通っていたが、dev のログが埋まるので直した。

### instant 検証で分かったこと（2026-11-08）

`/` から `/settings` へ遷移したときに警告が出た。

```
Next.js encountered uncached data during a navigation.
  src/lib/auth.ts (20:19) @ getMe
```

**`(app)/layout.tsx` に `instant = false` を置くだけでは足りなかった。** `validationLevel: 'warning'`（既定）は Page セグメントを暗黙に個別検証する。レイアウトの `false` が外すのは「そのレイアウト自身」と静的シェル検証だけ。

対処: 認証後の**各ページ**にも `export const instant = false` を追加した。

| ファイル | |
| --- | --- |
| `(app)/layout.tsx` | 既にあった |
| `(app)/page.tsx` | **追加** |
| `(app)/settings/page.tsx` | **追加** |
| `setup/page.tsx` | 既にあった |

`next.config.ts` の `validationLevel: 'manual-warning'` にすれば 1 行で済むが、**公開ページの検証も止まる**。その検証が `/login` の `searchParams` の問題を見つけたので、公開ページの検証は残した。

**M3 で作る `/new` と `/transactions/[id]` にも必要。** AGENTS.md に書いた。

### テーマ切り替えで分かったこと

| 事項 | 内容 |
| --- | --- |
| **`light-dark()` を使うとトークンが二重化しない** | ライト用とダーク用を別ブロックに書くと片方だけ直す事故が起きる。`light-dark(#f7f7f8, #09090b)` なら 1 行。切り替えは `color-scheme` だけ |
| **Lightning CSS が `light-dark()` をポリフィルする** | Tailwind v4 のビルドで `--lightningcss-light` / `--lightningcss-dark` に展開される。古いブラウザでも動く |
| ネイティブ UI も一緒に切り替わる | `color-scheme` を切り替えるので、スクロールバーや `<input type="date">` の見た目も追従する（M3 の日付入力で効く） |
| **ちらつき防止にはインラインスクリプトが必須** | 無いと、OS がダークで利用者がライトを選んでいる場合に一瞬ダークで描画される。`dangerouslySetInnerHTML` の唯一の例外として扱い、許容条件をセキュリティガイドラインに明記した |
| `role="radio"` を付けた `<button>` は Biome が指摘する | 本物の `<input type="radio">` に変えた。矢印キー操作と読み上げが標準で効くようになった |
| **dev サーバーが動いている間に `.next` を消すと 500 になる** | ビルド前に `rm -rf .next` を習慣にしていたが、開発者の dev サーバーを壊した。検証は別ポートの `next start` で行う |

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

- [x] M3-0 **Vitest とローカル DB の用意**（2026-11-08）
  - `vitest.config.mts`、`.env.test`、`scripts/test-db.sh`（Docker の捨て Postgres）
  - `src/test/setup.ts`（**localhost 以外を指していたらテストを止める**）
  - `src/test/db.ts`（`resetDb` / `seedTwoHouseholds` / 認可を迂回する raw 関数）
  - `src/test/server-only-stub.ts`（`server-only` は Next のバンドラ専用なので差し替え）
  - `src/lib/data/db.test.ts`（ハーネス自体の確認 6 件）
- [x] M3-1 `src/lib/money.ts`（`formatYen` / `formatBalance` / `summarize` / `sumExpense`）＋ テスト 13 件（2026-11-08）
- [x] M3-2 `src/lib/month.ts`（`monthRange` / `prevMonth` / `nextMonth` / `formatMonth` / `formatDateLabel` / `parseDateKey`）＋ テスト 28 件（2026-11-08）
- [x] M3-3 `src/lib/data/transactions.ts`（読み取り 3 + 変更 3）＋ **認可テスト 24 件**（2026-11-08）
- [x] M3-4b `src/lib/data/household.test.ts` — 世帯 DAL の **認可テスト 13 件**（2026-11-08）
- [x] M3-30 `src/lib/data/auth-adapter.ts` — better-auth の DB アダプタを DAL 側に移動（約束 A を守るため）（2026-11-08）
- [x] M3-4 `src/lib/data/household.ts`（M2 で実装済み。`getMyHousehold` / `listMembers` / 更新系）
- [x] M3-5 ホーム画面 — 月切り替え（`MonthSwitcher`）（2026-11-08）
- [x] M3-6 ホーム画面 — 月次合計（`MonthSummary`）（2026-11-08）
- [x] M3-7 ホーム画面 — 日付グループ化した一覧（`TransactionList` / `groupByDate` ＋ テスト 8 件）（2026-11-08）
- [x] M3-8 ホーム画面 — 空表示（`EmptyMonth`）（2026-11-08）
- [x] M3-9 `createTransaction` アクション（2026-11-08）
- [x] M3-10 `/new` — 種別タブ、金額入力（`TransactionForm`。**開いた瞬間に金額を打てる**）（2026-11-08）
- [x] M3-11 `/new` — カテゴリ選択（1 タップ。種別で選択肢が入れ替わる）（2026-11-08）
- [x] M3-12 `/new` — 折りたたみ項目（日付・支払った人・メモ）（2026-11-08）
- [x] M3-13 `updateTransaction` / `deleteTransaction` アクション（2026-11-08）
- [x] M3-14 `/transactions/[id]` — 編集フォーム（`TransactionForm` を共有）（2026-11-08）
- [x] M3-15 `/transactions/[id]` — 削除（確認付き）、見つからない表示（2026-11-08）
- [x] M3-16 エラー表示（`useActionState` なので保存失敗でも入力が残る）（2026-11-08）
- [x] M3-18 **受入条件 AC-9 を再実施**（2026-11-08、**一部**）
  - 存在しない ID で「見つかりませんでした」になることを確認
  - **世帯をまたぐ本番の確認は 2 つ目のメールアドレス待ち**。受け皿は DAL の認可テスト 54 件（ADR-0005 約束 C）
- [x] M3-19 [テスト戦略 §4.4](../03-guidelines/testing-strategy.md#44-金額と日付の確認m3)（金額と日付の確認。**全角数字を含む**）（2026-11-08）
  - [x] 境界値を自動テストに入れた（`src/lib/validation.test.ts` 44 件）
    - **全角の英字が招待コードで弾かれる不具合を検出して修正**（`normalizeAlnum` を追加）
    - 仕様の食い違いも 1 件見つけた: 全角数字は「弾く」ではなく「正規化する」が実装。ドキュメント側を直した
  - [x] 画面を通した確認（手作業）— OK
- [x] M3-20 入力速度の計測（10 秒 / 5 タップ以内）（2026-11-08）— 基準内
- [x] M3-23 **UI を shadcn/ui（Radix ベース）に載せ替え**（2026-11-08）
  - [ADR-0008](../05-decisions/ADR-0008-shadcn-ui.md)。「シンプルすぎる」という評価を受けての対応
  - `globals.css` を全面書き直し。トークンの命名を shadcn に合わせ、旧トークンは削除
  - 生成: `button` / `card` / `input` / `label` / `badge` / `separator` / `collapsible` / `empty`
  - 自前: `SegmentedControl`（種別・テーマ。中身は本物の radio）/ `field` を `Label`+`Input` の上に載せ替え
  - **`Button` と `Input` の高さを 44px に上げた**（shadcn の既定は `h-8`。NFR-U7 違反だった）
  - `scripts/check-contrast.mjs`（`pnpm check:contrast`）を追加。**AA 落ちを 2 件検出して修正**
  - アイコンは lucide。全画面に適用（ホーム / 記録 / 編集 / 設定 / 認証 / セットアップ）
- [x] M3-17 受入条件 AC-4〜AC-8 を実施（2026-11-08）— **全件 OK**
- [x] M3-21 `pnpm lint` / `pnpm build` / **`pnpm test`** を通してコミット（2026-11-08）
- [x] **M3-22 v1 完成の確認**（2026-11-08）。使い始める

### 完了

（なし）

---

### M4 で見つけて直した不具合

**`asChild` の Button が全部壊れていた**（2026-11-08）。

```
Slot failed to slot onto its children.
Expected a single React element child or `Slottable`.
  at HomePage (src/app/(app)/page.tsx:35)
```

| | |
| --- | --- |
| 原因 | M4-11 で `Button` に `pending` を足したとき、children を Fragment で包んだ。**Radix の Slot は子が Fragment だと props を黙って捨てる** |
| 症状 | **ホーム画面が丸ごと表示できない。** `MonthSwitcher` / `EmptyMonth` / 編集画面の「ホームに戻る」が該当 |
| なぜ見逃したか | `tsc` も `pnpm build` も通る**実行時だけの不具合**。画面部品のテストが 1 件も無かった |
| 直し方 | `asChild` のときは `children` をそのまま渡す |

**同じ類を止める仕掛けを入れた。** `react-dom/server` の
`renderToStaticMarkup` で描く煙テスト（`src/components/render.test.tsx`、
`src/components/ui/button.test.tsx`、15 件）。新しい依存は入れていない。
**壊れた版に戻して ★ の 5 件が落ちることを確認済み。**

`href` と文字だけでは検出できない（Fragment は props を捨てるだけで
例外にならない）ので、**`className` と `data-slot` が子に届いているか**を見る。

**`refresh()` を足したら、テーマのスクリプトでエラーが出た**（2026-11-08）。

```
Encountered a script tag while rendering React component.
Scripts inside React components are never executed when rendering on the client.
```

| | |
| --- | --- |
| 原因 | M4-2 / M4-7 で Server Action に `refresh()` を 5 箇所足した。**`refresh()` はルートレイアウトまでクライアントで再描画する**ので、`<head>` のインラインスクリプトが「クライアント描画された `<script>`」になり、React が開発時エラーを出す |
| 症状 | **エラーオーバーレイで画面が見えない。** サーバーの HTML は正しいので、HTTP で叩くと 200 が返り気づけない |
| 直し方 | Next.js 公式ガイドの手順。`type` をサーバーで `text/javascript`、クライアントで `text/plain` にし、食い違いを `suppressHydrationWarning` で黙らせる |
| **1 度直し損ねた** | `type` の仕掛けだけ入れて `"use client"` を付けなかった。Server Component では `typeof window` がサーバーでしか評価されず、RSC ペイロードに `text/javascript` が載ったまま渡るので**症状が変わらない**。公式ガイドの例が Client Component の中にあることを読み落としていた |

**ついでに同じガイドに書かれていた別の落とし穴も塞いだ。** 開発時は React の
Strict Mode が 1 度再マウントし、そのとき `<html>` の属性を JSX にあるものだけに
戻すため `data-theme` が消える。`ThemeSync`（`useLayoutEffect`）で貼り直す。

**教訓: `refresh()` はルートレイアウトから作り直す。** 画面に残る更新で使うときは、
ルートレイアウトに「サーバーでしか成立しないもの」が無いか確認する。

### M3 で見つけて直した不具合

**1,000 円以上が保存できなかった**（2026-11-08、利用者が最初の手動確認で発見）。

```
指定されている形式で入力してください
```

金額欄は **3 桁区切りで `1,280` と表示**するのに、`pattern="[0-9]*"` が
付いていた。カンマが pattern に合わないため、**ブラウザが送信を止めていた。**

| | |
| --- | --- |
| 原因 | `pattern="[0-9]*"`（iOS で数値キーボードを出すための古い書き方）と、表示用のカンマ区切りの併用 |
| 症状 | **999 円以下は通り、1,000 円以上だけが弾かれる** |
| なぜ見逃したか | 自動テストはサーバー側の `parseAmount` だけを見ており、**DOM の制約検証を踏んでいない**。手で試した金額も 999 円以下だったとみられる |
| 直し方 | `pattern` を削除。数値キーボードは `inputMode="numeric"` だけで開く。検証はサーバーの `parseAmount` が行う |

**教訓: 表示用に整形した値を、その整形を許さない制約と同じ欄に置かない。**
`pattern` / `type="number"` / `maxLength` を付ける欄は、表示値と送信値を分けるか、
整形をやめる。この欄は `name` を持たない表示専用（送信は hidden の `amount`）
なので、**制約検証を付ける意味がそもそも無かった。**

**`new Date()` のプリレンダリングエラー**（2026-11-08）。

```
Next.js encountered the unstable value new Date() while prerendering.
```

`month.ts` の `currentMonth` / `parseMonth` / `formatDateLabel` / `todayKey` が
**既定引数 `= new Date()`** で時計を読んでいた。呼び出し側（`/`、`/new`、
`TransactionList`）が引数を省略していたため、レンダリング中に評価された。

**これは同じ原因で 2 回目。** 1 回目は supabase-js がトークンの期限判定で
`Date.now()` を読んでいた件（M2）。どちらも「気づかないうちに時計を読む」形。

直したこと:

| # | 内容 |
| --- | --- |
| 1 | `src/lib/clock.ts` の `requestNow()`（`connection()` を待ってから `new Date()`）を作り、**時計を読む場所を 1 箇所にした** |
| 2 | `month.ts` の 4 関数を**必須引数**に変えた。既定引数をやめたので、呼び忘れると**型エラーになる** |
| 3 | `TransactionList` は `today` を props で受け取る |

**2 の効果はすぐ出た。** 変更直後の `tsc --noEmit` が `today` の渡し忘れを 1 件検出した。場当たりに直すと 3 回目が来るので、型で防ぐ形にした。

### M3-5〜16 で判断したこと

| 事項 | 内容 |
| --- | --- |
| **タイムゾーンを JST 固定にした** | 「今日 / 昨日」をサーバーで判定するため。本番（Vercel など）の既定は UTC で、JST とは 9 時間ずれるので **1 日のうち 9 時間が誤表示**になる。端末ごとのタイムゾーンを扱うには日付見出しを Client Component にする必要があり、ハイドレーションの不一致かちらつきが出る。**利用者が日本の一家族なので `TZ=Asia/Tokyo` が最も単純で正確**。NFR-D8 / NFR-O7 に記録した |
| 金額は表示と送信を分けた | 入力欄には 3 桁区切りで見せ、`hidden` で数字だけ送る。`"1,280"` という文字列を保存しない |
| 種別を変えたらカテゴリをクリアする | 支出に収入カテゴリが残ると DAL の種別チェックで弾かれる。UI 側で先に外す |
| `label` で包む暗黙の関連付けは Biome が通さない | `children` の中に input があることを静的に判断できない。`htmlFor` で明示した（入れ替えに強くもなる） |
| 削除の確認にダイアログを使わない | コンポーネント内の状態で確認を出す。スマホでの表示が安定する |
| 下部の固定ボタンは M4 で下部タブに置き換える | いまは「記録する」「設定」を画面下に固定。`env(safe-area-inset-bottom)` を見ている |

### M3-3 で分かったこと（認可テスト）

| 事項 | 内容 |
| --- | --- |
| **約束 A の違反を静的チェックが捕まえた** | `src/lib/auth/server.ts` が better-auth のアダプタのために `@/lib/data/db` を import していた。認可上の危険はないが、**例外を作ると grep の価値が落ちる**。`src/lib/data/auth-adapter.ts` を作って DAL 側に寄せ、0 件に戻した |
| grep に生成物が引っかかる | `src/generated/prisma/**` に `queryRawUnsafe` や `DATABASE_URL` が型定義として出てくる。**ドキュメントの grep コマンドに除外を入れた** |
| `update` ではなく `updateMany` | `update({ where: { id } })` は世帯の条件を付けられない。`updateMany({ where: { id, householdId } })` にして `count === 0` なら `NOT_FOUND` |
| **外部キーは参照先の所属を守らない** | 他世帯の `categoryId` / `paidById` でも行は存在するので通ってしまう。DAL の `validateReferences()` で明示的に確認し、テストで固定した |
| 認証だけモックし、DB はモックしない | `vi.mock("@/lib/auth")` で `requireMember` を差し替え、クエリは本物を投げる。モックすると `where` の書き忘れを検出できない |

**DAL の全 12 関数にテストがある**ことを機械的に確認した（関数名と `describe` の対応をスクリプトで突き合わせ）。

### M3-0〜2 で分かったこと

| 事項 | 内容 |
| --- | --- |
| **`Intl` の `currency: "JPY"` は全角の ￥ を返す** | `￥`（U+FFE5）で、半角の `¥`（U+00A5）ではない。半角数字と並べると幅が揃わない。**桁区切りだけ `Intl` に任せ、記号は自前で付ける**形にした。環境の ICU に依存しなくなる利点もある。**テストで気づいた** |
| `server-only` は Node から require できない | Next.js のバンドラが解決する仮想モジュール。Vitest では空のモジュールに別名を張る |
| `vitest.config.ts` は警告が出る | ESM 構文なので `.mts` にする |
| Vitest 5 は `@types/node ^22 \|\| >=24` を要求 | `^20` から `^24` に上げた（Node 26 を使っているので実態に近い） |
| `0002` はローカルに `anon` / `authenticated` ロールが必要 | `scripts/test-db.sh` が先に作る |
| **ローカルタイムで日付を取り出すと前日になりうる** | テストで実証した。`@db.Date` は UTC 0 時で返るので、負のオフセットの環境では `getDate()` が 1 日ずれる。JST では偶然一致するため**日本で開発している限りバグが隠れる** |

## M4 — スマホ UI の仕上げ

### 未着手

- [x] M4-16 **PC 向けのレイアウトとカテゴリ別の内訳**（2026-11-08）
  - [ADR-0009](../05-decisions/ADR-0009-desktop-layout-and-category-breakdown.md)。本人の要望「PC はスマホと変えたい。サイドバーや図で見やすく」
  - **スマホの作りは変えない。** v1 で受入条件を通した構成をそのまま残す
  - `md` 以上でサイドバー（240px、世帯名と表示名つき）。下部タブは `md:hidden`
  - ホームは PC で 2 カラム（左に一覧、右に合計と内訳）
  - `/new` と編集は PC でも 480px のまま（横に広げると入力が遅くなる）
  - **カテゴリ別の内訳を v1 スコープに入れた**（FR-L8）。3 案を提示して A（内訳だけ）を選んでもらった
  - 集計は純関数（`src/lib/category-breakdown.ts`、テスト 9 件）。**DB のクエリを足さない**ので認可の面が増えない
  - グラフのライブラリは入れない（横棒は `div` 2 つで描ける）
  - **`--chart-*` のコントラストが 2 件落ちていた**のを検査に追加して修正（ライトの 4、ダークの 1）
  - [ ] 画面での確認（手作業）

- [x] M4-17 **先月との比較**（FR-L9）（2026-11-09）
  - 本人の指摘「月の表示によってだけ見ることができていて、比較ができない」
  - 合計カードに `先月比 +¥12,400（+7%）`、カテゴリ別の内訳の各行に増減額と矢印
  - 先月に無かったカテゴリは「新しく追加」（`+100%` より分かりやすい）
  - **増減に色を付けない。** 支出の増加を赤にすると月初が常に「改善」に見える
  - 先月が 0 のときは割合を出さない（0 で割らない）
  - ホームが先月ぶんの行も取る。**合計だけの DAL 関数は足さない**（認可の面を増やさない）
  - [ ] 画面での確認（手作業）

- [x] M4-23 **一覧の支出を赤、収入を緑にする**（2026-11-09）
  - 本人の指摘「記録の履歴に関して、支出は赤文字、収支は緑で表示してほしい」
  - **UI/UX設計 §6.3 の「支出を赤にしない」方針を反転させた。** 理由も §6.3 に残した
  - **赤にするのは一覧の 1 件ごとの金額だけ。** 合計・内訳・年のページは中立色のまま（支出だけが並ぶ場所で全部赤くしても情報が増えない）
  - `--destructive`（削除ボタン）ではなく `--deficit` を使う
  - 煙テストで色を固定（支出 → `text-deficit` / 収入 → `text-income`）

- [x] M4-21 **Tier 3: 定期支出（手動トリガー版）**（FR-R1〜R3）（2026-11-09）
  - [ADR-0011](../05-decisions/ADR-0011-tier1-and-recurring.md)
  - **マイグレーション `0005_recurring`。列の追加のみ**（既定値 false なので既存行は影響なし）
  - **本番適用済み（2026-11-09）**
  - 部分インデックス `WHERE recurring` を付けた（false の大多数を載せない）
  - 判定は純関数 `recurringCandidates`（テスト 20 件）。**1/31 → 2/28 の寄せも確認**
  - DAL `createRecurringForMe` + **認可テスト 5 件**
  - ホームに「毎月の支出」カード。**押すまで何も起きない**
  - [ ] 画面での確認（手作業）

- [ ] **M4-22 自動実行とリマインド通知** — **デプロイ先の決定待ち（M5-1）**
  - 定期支出の Cron 化: `registerRecurring` をそのまま呼べる形にしてある
  - リマインド通知: プッシュには公開 HTTPS と VAPID 鍵が必要で、**検証する手段が無いため未着手**

- [x] M4-20 **Tier 2: カテゴリごとの月予算**（FR-B1〜B3）（2026-11-09）
  - [ADR-0011](../05-decisions/ADR-0011-tier1-and-recurring.md)
  - **マイグレーション `0004_budgets`。追加のみで既存テーブルに触らない**
  - **本番適用済み（2026-11-09）。** 下の「M4-20 / M4-21 本番適用の確認結果」を参照
  - ローカルの捨て DB で CHECK（0 / 負数 / 上限+1）・一意制約・cascade を実測
  - DAL `src/lib/data/budgets.ts` + **認可テスト 12 件**（他世帯のカテゴリに設定できない / 他世帯の予算を 0 で消せない）
  - `/settings/budgets` で全カテゴリをまとめて保存。空欄か 0 で予算なし
  - 内訳の棒を「予算に対する消化率」に差し替え、超過は `--destructive`
  - `pnpm check:contrast` に「超過の棒 / 下地」を追加（両モード 3:1 以上）
  - [ ] 画面での確認（手作業）

- [x] M4-19 **Tier 1: 複製・記録忘れの提示・支払者別の集計**（2026-11-09）
  - [ADR-0011](../05-decisions/ADR-0011-tier1-and-recurring.md)。本人の要望「Tier 3 まで実装してほしい」
  - **FR-T11 記録の複製**: 編集画面に「これと同じ記録を作る」。`/new?amount=&category=&paidBy=&memo=&kind=` で初期値を渡す。**日付は引き継がない**（複製は「今月も入れる」用途）
  - **FR-L11 記録忘れの提示**: 先月あって今月まだ無い支出カテゴリを提示。**今月を見ているときだけ**出す。先月ぶんの行は先月比のために既に取得済みなので**追加クエリ 0**
  - **FR-L12 支払者別の集計と精算**: `paidById` を v1 から記録していたが**一度も集計していなかった**。2 人の世帯で支払者が全員分かっているときだけ均等割りの精算額を出す
  - 3 つとも純関数 + 表示だけ。**DAL 関数も認可の面も増やしていない**
  - [ ] 画面での確認（手作業）

- [x] M4-18 **年のページ**（FR-L10）（2026-11-09）
  - [ADR-0010](../05-decisions/ADR-0010-year-page.md)。本人の要望「2026年のページがあって、全ての月はこのような感じとページで見れるようにしたい」
  - `/year/[year]`。`/year` は今年へリダイレクト。不正な年は今年扱い（AC-7 と同じ方針）
  - **12 か月を必ず並べる。** 記録が無い月も「記録なし」として出す（抜くと「使っていない月」と「記録を忘れた月」が区別できない）
  - 棒は支出が最も多い月を基準にした相対値。各行からその月のホームへ
  - 年間のカテゴリ別内訳は PC のみ（`CategoryBreakdown` を流用）
  - DAL `listTransactionsByYear` + **認可テスト 6 件**（境界: 1/1・12/31 を含み、前年 12/31・翌年 1/1 を含まない）
  - 集計は純関数 `summarizeYear`（テスト 8 件）。**SQL で集計しない**（生 SQL を避ける / テストが DB 不要になる）
  - 導線: サイドバー「年の一覧」/ 下部タブ「年」/ **ホームの月見出しをリンクに**
  - **煙テストが実行時エラーを 1 件検出。** `usePathname()` は型が `string` だがルーター文脈の外では null を返す。前方一致に変えた途端に落ちた
  - [ ] 画面での確認（手作業）

- [x] M4-1 下部タブ（セーフエリア対応）（2026-11-08）
  - ホームと設定に置く。**`/new` と編集画面には置かない**（下部は保存ボタンの場所）
  - その 2 画面は左上に ✕（`FormPageHeader`）。ワイヤー §4.2 の通りにした
  - フォーム下部の「やめる」は ✕ に集約して削除
- [x] M4-2 `/settings` — 世帯名の変更（2026-11-08）
- [x] M4-3 `/settings` — 招待コードの表示（M2 で実装済み）
- [x] M4-4 `/settings` — メンバー一覧（M2 で実装済み）
- [x] M4-5 `/settings` — 表示名の変更（2026-11-08）
- [x] M4-6 `/settings` — ログアウト（M2 で実装済み）

> M4-2 / M4-5 は DAL（`updateMyHouseholdName` / `updateMyDisplayName`）と
> その認可テストが M2 の時点で揃っていた。足したのは Server Action
> （`renameHousehold` / `renameMe`）と UI（`InlineRename`）だけ。
> 画面に残るので `redirect` せず `refresh()` で再描画する。
- [x] M4-7 カテゴリ管理（追加・改名・非表示）（2026-11-08）
  - `/settings/categories` として**別ページにした**（UI/UX設計 §4.6 の「M4 で決める」の判断）。行ごとに改名と非表示の操作が付くので、設定画面に折りたたむと縦に長くなりすぎる
  - DAL `src/lib/data/categories.ts` + **認可テスト 17 件**
  - **削除は作らない。** 消すと過去の記録のカテゴリ名が失われる（FR-C6）
  - 同名の追加・改名は一意制約（P2002）を拾って項目エラーにする
  - 新しいカテゴリは「その他」（sortOrder 999）の手前に入る
- [x] M4-8 カテゴリの並びを直近 30 日の使用頻度順に（2026-11-08）
  - `listCategories(kind, usageSince)`。`groupBy` で使用回数を数え、回数の多い順 → `sortOrder` → 名前
  - **集計期間の下限は必須引数**（`daysAgo(await requestNow(), 30)`）。既定引数で時計を読まない（§8.0）
  - `month.ts` に `daysAgo` を追加（テスト 4 件）
  - 認可テストを 4 件追加。**他世帯の使用回数で並びが変わらないこと**を含む
- [x] M4-9 日付の「今日 / 昨日」ショートカット（2026-11-08）
  - `dateShortcuts(now)` を `month.ts` に置き、**サーバーで作って渡す**（クライアントで `new Date()` を読むとハイドレーションがずれる）
  - 日付欄を制御された状態にして、押すと差し替わるようにした
- [x] M4-10 タップ領域・コントラスト・フォーカス表示の調整（2026-11-08）
  - M3-23 で `Button` / `Input` を 44px にし、`pnpm check:contrast` と `focus-visible` のリングを入れた
  - **M4-7 / M4-2 で自分が 28px のボタンを作っていたのを検出して直した**（カテゴリ行の鉛筆・目、「変更」「閉じる」、日付のショートカット）
  - 検出に使った grep: `grep -rnE 'size="(xs|sm|icon-xs|icon-sm)"' src/app src/components`
  - 実機での確認は M4-13 に残る
- [x] M4-11 保存中の状態表示（2026-11-08）
  - **`Button` に `pending` prop を足して 1 箇所に寄せた。** 画面ごとに書くと付け忘れが出る
  - スピナー（`Loader2` + `animate-spin`）を出し、`disabled` も自動で付く
  - アイコンだけのボタンは中身をスピナーに置き換える（並べる余地が無い）
  - 既存の `disabled={pending}` 13 箇所を `pending={pending}` に置き換えた
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
- [x] M5-4 アイコンを作る（2026-11-08、**デザインは仮**）
  - `src/app/icon.svg`（ブラウザのタブ。¥ をパスで描いてフォントに依存させない）
  - `src/app/apple-icon.tsx`（`ImageResponse` で 180×180 の PNG を生成）。**iOS は manifest の icons を見ず apple-touch-icon を使い、SVG も受け付けない**
  - スキャフォールドの `src/app/favicon.ico`（Next.js の既定アイコン）を削除。残すと `rel="icon"` がそちらを指す
  - 192 / 512 / maskable の PNG は未作成。Android でのインストール可否は M5-7（デプロイ後）に確認する
  - デザインは未確定事項 #2。差し替えるときは `pnpm check:contrast` が色の一致を見る
- [x] M5-5 `src/app/manifest.ts`（2026-11-08）
- [x] M5-6 `theme-color` と `viewport` の調整（2026-11-08）
  - **`viewport-fit=cover` を足した。** これが無いと `env(safe-area-inset-*)` が常に 0 で、下部タブが PWA でホームバーに潜る
  - `theme-color` が `#f7f7f8` / `#09090b` のまま古く、実際の背景（`#fafafa` / `#0a0a0a`）とずれていた。**`pnpm check:contrast` に「トークンと手書き 16 進数の一致」検査を足して固定した**
- [ ] M5-7 スマホでホーム画面に追加して全画面起動を確認
- [ ] M5-8 `pnpm lint` / `pnpm build` を通してコミット

### 完了

（なし）

---

## 未確定事項

| # | 内容 | 判断の期限 | 状態 |
| --- | --- | --- | --- |
| 1 | デプロイ先（Vercel / 自前サーバー） | M5 の着手前 | **未決** |
| 2 | PWA アイコンのデザイン | M5 | **仮のものを置いた**（インディゴ地に ¥）。差し替えは任意 |
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

### M4-20 / M4-21 本番適用の確認結果（2026-11-09）

`pnpm db:deploy` で `0004_budgets` と `0005_recurring` を本番に適用した。

| 確認項目 | 結果 |
| --- | --- |
| `budgets` テーブル | あり。制約 5 件（CHECK 2 / FK 2 / PK） |
| `transactions.recurring` | `boolean` / 既定 `false` / NOT NULL |
| 部分インデックス `transactions_recurring_idx` | あり |
| **`anon` / `authenticated` の `public` 権限** | **0 件**（PostgREST は塞がったまま） |
| `budgets` の権限保持者 | `postgres` と `service_role` のみ |
| 既存データ | `transactions` 1 件 / `categories` 18 件がそのまま。`recurring` は全件 `false` |
| `pnpm db:status` | 「Database schema is up to date!」 |

**`0002` の `alter default privileges` が新規テーブルにも効くことを本番で実測できた。**
ローカルの捨て DB には `anon` / `authenticated` ロールが無く、
[DB設計 §4.1「将来のテーブルも守られる」](../02-design/database-design.md#将来のテーブルも守られる)
はこれまで未検証だった。

#### 段取りの反省

スキーマを変える機能（予算・定期支出）を 2 つ続けて実装したあと、
「マイグレーションが必要」と書いただけで**画面が動かない状態で渡してしまった。**
利用者は `transactions.recurring does not exist` のエラーに当たった。

**次に DB を変える実装をするときは、適用が必要なことを実装の前に伝える。**

### M3 確認結果（2026-11-08、完了＝**v1 完成**）

ブラウザで実際に操作して確認。**AC-4〜AC-8 は全件 OK。**

| 受入条件 | 結果 |
| --- | --- |
| AC-4 記録を登録できる | OK（既定値は 支出 / 今日 / 自分。日付見出しも「今日」でずれなし） |
| AC-5 金額の検証 | OK（空・0・小数・単位つき・上限超えを弾く。全角は 1,280 円として通る） |
| AC-6 編集・削除 | OK（削除は確認を経てから消える） |
| AC-7 月の移動と集計 | OK（URL に残る、リロード・戻るで同じ月、月末月初も正しい月に入る、`?m=abc` は当月） |
| AC-8 空の月 | OK（合計はすべて ¥0） |
| AC-9 他世帯のデータ | **一部**。存在しない ID は「見つかりませんでした」。世帯をまたぐ確認は 2 つ目のメールアドレス待ち |
| 入力速度（NFR-P3 / NFR-U2） | OK（10 秒 / 5 タップ以内） |
| 合計の検算 | OK（支出合計が手計算と一致、差額 = 収入 − 支出） |

- `pnpm lint` / `tsc --noEmit` / `pnpm build` / `pnpm test`（178 件）/ `pnpm check:contrast`: すべて OK
- **確認の途中で見つかった不具合はこのファイルの「M3 / M4 で見つけて直した不具合」に記録済み**（1,000 円以上が保存できない件は、この手動確認で本人が発見したもの）
- 残り: AC-3 と AC-9 の世帯間確認（どちらも 2 つ目のメールアドレスが必要）

### M1 確認結果（2026-11-07）

- `pnpm lint`: OK / `pnpm build`: OK（型エラー 0）
- `pnpm db:deploy`: OK（`0001_init` 適用済み）
- `pnpm db:status`: 「Database schema is up to date!」
- 本番スキーマ: テーブル 4 + `_prisma_migrations` / `kind` enum / **CHECK 制約 5 件** / 外部キー 6 / インデックス 10 / **RLS はすべて false（意図どおり）**
- アプリ実行時の経路（Next.js → driver adapter → Transaction pooler 6543）:
  - 単純クエリ OK / `include` でリレーション取得 OK / **`$transaction` OK** / CHECK 制約の拒否 OK / cascade delete OK
  - `occurredOn` は `2026-11-07T00:00:00.000Z`。JST では UTC 整形とローカル整形がどちらも「11月7日」になる（**負のオフセット環境なら前日になる。UTC 固定が必要**）
- 残課題: なし

### M2 確認結果（2026-11-08、完了）

better-auth への移行後、実際に通した結果。

```
better-auth のテーブル : 4つ揃っている
user        : 1件（確認済み = true）
account     : 1件（providerId=credential、パスワードあり）
session     : 2件
verification: 0件（消費済み）
households  : 1件（わが家）
profiles    : 1件（松田竜英、世帯あり）
categories  : 18件（支出 13 / 収入 5）
```

- `pnpm lint` / `pnpm build`: OK
- ルートの種別: `/` `/setup` `/settings` `/api/auth/[...all]` が Dynamic、`/login` が Partial Prerender、`/signup` `/login/link` `/login/verify` が Static
- 未ログインのガード: `/` → 307 `/login`、`/setup` → 307 `/login`
- **`profiles → user` の外部キーが張れた**（ADR-0007 の狙いどおり。Supabase Auth のときは `auth` スキーマが Prisma 管理外で張れなかった）
- **`anon` / `authenticated` の `public` 権限が 0 件**（PostgREST は塞がったまま）
- 残り: AC-3（2 つ目のメールアドレスが必要）、AC-9（M3 へ）

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
