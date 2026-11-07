# 用語集

最終更新: 2026-11-07

**この表が命名の正。** UI の表記、コード上の識別子、DB の列名を 1 対 1 で対応させる。揺れると（例: `household` と `family` が混在する）読む側がコストを払い続けるので、新しい概念を足すときはまずここに書く。

---

## 1. ドメイン用語

| 概念 | UI 表記 | コード / DB | 意味と注意 |
| --- | --- | --- | --- |
| 世帯 | **わが家** | `Household` / `households` | 家計簿を共有する単位。家族 1 グループ = 1 世帯。UI で「世帯」という硬い語は使わない |
| メンバー | **メンバー** | `profile` / `profiles` | 世帯に所属するユーザー。`auth.users` と 1:1 |
| 記録 | **記録** | `transaction` / `transactions` | 収支 1 件。「取引」「明細」とは呼ばない |
| 種別 | **支出** / **収入** | `kind`（`'expense'` \| `'income'`） | 記録の向き。金額の符号では表さない |
| 金額 | **金額** | `amount`（integer, 円） | 常に正の整数。1 円未満・0・負数は不可 |
| 日付 | **日付** | `occurred_on`（date） | いつの支出か。**時刻を持たない** |
| 支払った人 | **支払った人** | `paid_by` → `profiles.id` | 実際にお金を出した人。家計上の意味を持つ |
| 入力した人 | （UI に出さない） | `created_by` → `profiles.id` | その記録を登録した人。監査用 |
| カテゴリ | **カテゴリ** | `category` / `categories` | 支出用・収入用に分かれる。世帯ごとに持つ |
| 未分類 | **未分類** | `category_id = null` | カテゴリ未選択の記録。`'未分類'` という名前のカテゴリ行は作らない |
| 非表示（カテゴリ） | **非表示にする** | `archived = true` | 新規登録の選択肢から外す。既存の記録には残る。削除はしない |
| ユーザー ID（Supabase） | （UI に出さない） | `Profile.userId` | Supabase Auth の `user.id`。`Profile.id` とは**別物** |
| 招待コード | **招待コード** | `invite_code` | 世帯に参加するための 6 桁の英数字（大文字） |
| 差額 | **差額** | `balance` | 収入合計 − 支出合計。「収支」と呼ばない（種別と紛れる） |
| 月 | **2026年11月** | `month`（`"2026-11"` 形式の文字列） | 一覧の単位。URL には `?m=2026-11` で持つ |

### 呼ばない言葉

| 使わない | 代わりに | 理由 |
| --- | --- | --- |
| 家族 / family | わが家 / `household` | 「家族」は人の集合、「世帯」は家計簿の単位。混ざると所属の話が曖昧になる |
| 取引 / 明細 / entry | 記録 / `transaction` | UI の語と DB の語を 1 対 1 に保つ |
| 収支（単体で） | 種別 / 差額 | 「支出 or 収入」なのか「その差」なのか判別できない |
| ユーザー（UI で） | メンバー / あなた | 利用者 2〜3 人のアプリで「ユーザー」は硬い |
| 削除（カテゴリ） | 非表示にする | 実装が archive であることを UI でも一致させる |

---

## 2. 技術用語

実装時に前提となる語。知らないと設計の意図を読み違えるものだけ載せる。

| 用語 | 意味 | このプロジェクトでの関わり |
| --- | --- | --- |
| **DAL**（Data Access Layer） | `src/lib/data/` のモジュール群。DB に触る唯一の場所 | **認可の本体。** ここの `where` が「他世帯のデータが見えない」の唯一の保証 → [ADR-0005](../05-decisions/ADR-0005-authorization-in-app-layer.md) |
| **Prisma** | TypeScript の ORM。スキーマ定義・マイグレーション・クエリを担う | `prisma/schema.prisma` がスキーマの正 |
| **driver adapter** | Prisma 7 が必須とする DB ドライバの接続層 | `@prisma/adapter-pg` + `pg` を使う |
| **RLS**（Row Level Security） | PostgreSQL の行レベルアクセス制御 | **使わない。** 2026-11-07 に ADR-0005 で廃止した。Prisma は所有者ロールで接続するためポリシーが効かない |
| **Server Component** | サーバーだけで実行される React コンポーネント。既定 | データの読み取りはここで行う |
| **Client Component** | ブラウザでも実行されるコンポーネント。`"use client"` を書く | 入力フォームなど、操作が必要な部分だけ |
| **Server Action** | `"use server"` を付けた関数。フォーム送信などから呼べる。実体は POST | データの変更はすべてここを通す。**直接 POST で叩けるため、中で認証を確認する** |
| **`proxy.ts`** | Next.js 16 で Middleware が改名されたもの。リクエスト前に走る | Supabase のセッション更新（トークンのリフレッシュ）に使う |
| **Cache Components** | `next.config.ts` の `cacheComponents: true`。キャッシュの扱いが従来と変わる | `cookies()` を読む箇所に制約が出る → [アーキテクチャ §6](../02-design/architecture.md) |
| **`instant`** | ルートセグメントの設定。navigation が即時かを検証させる | 認証後の画面は `instant = false` にする |
| **PKCE** | 認可コードを安全に交換する手順 | マジックリンクのコールバックで使われる |
| **マジックリンク** | メールに届くリンクを開くとログインできる方式。パスワードなし | v1 の唯一の認証方式 |
| **PWA** | ホーム画面に追加してアプリのように使える Web アプリ | M5 で対応 |
| **Publishable key** | Supabase の公開可能なキー（`sb_publishable_...`、旧 anon キー）。ブラウザに出てよい | **認証にのみ**使う |
| **`DATABASE_URL`** | Prisma の接続文字列（Supabase の Session pooler） | **DB の全権を持つ。** ブラウザに出さない。`NEXT_PUBLIC_` を付けない |
| **Secret key** | 旧 `service_role` キー | **使わない** |

---

## 3. 表記ルール

### 3.1 コード

| 対象 | 規則 | 例 |
| --- | --- | --- |
| ファイル・ディレクトリ | kebab-case | `transaction-list.tsx`, `02-design/` |
| React コンポーネント | PascalCase | `TransactionList` |
| 関数・変数 | camelCase | `createTransaction`, `monthStart` |
| 型・インターフェース | PascalCase | `Transaction`, `ActionResult` |
| Prisma のモデル・フィールド | PascalCase / camelCase | `Transaction`, `occurredOn` |
| DB のテーブル・列（`@map` 後） | snake_case（複数形のテーブル名） | `transactions`, `occurred_on` |
| 定数 | UPPER_SNAKE_CASE | `MAX_MEMO_LENGTH` |

詳細 → [コーディング規約](../03-guidelines/coding-standards.md)

### 3.2 DB の列名とコードの変数名

Supabase から返るオブジェクトは **snake_case のまま扱う**（`occurred_on` を `occurredOn` に変換しない）。変換層を作ると、DB のスキーマと画面の間に対応表が増えて追いにくくなる。アプリ内部で新しく組み立てる値だけ camelCase にする。

### 3.3 数値と日付の表記

| 対象 | 表示 | 内部表現 |
| --- | --- | --- |
| 金額 | `¥1,280`（3 桁区切り） | `number`（整数・円） |
| 収入の金額 | `+¥320,000` | 同上（符号は持たず `kind` で判断） |
| 差額 | `+¥137,600` / `−¥12,000` | `number`（負になりうる） |
| 日付（一覧の見出し） | `11月7日 (金)` / `今日` / `昨日` | `string`（`"2026-11-07"`） |
| 月 | `2026年11月` | `string`（`"2026-11"`） |

### 3.4 ID の表記

| 用語 | 意味 |
| --- | --- |
| ユーザー ID | `auth.users.id` = `profiles.id`。同じ値 |
| 世帯 ID | `households.id` |

「ユーザー ID」と「プロフィール ID」は同一の値を指す。文書内では **ユーザー ID** に統一する。
