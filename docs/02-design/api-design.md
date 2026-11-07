# API 設計（Server Actions / Route Handlers）

最終更新: 2026-11-07

**目的: インターフェースを統一する。** 入力・出力・エラーの形を 1 つに決めて、画面側の扱いを揃える。

---

## 1. 前提: REST API は作らない

Monely のクライアントは同じ Next.js アプリだけ。HTTP の API 層を作ると、型定義・検証・エラー処理が二重になる。

| 操作 | 実現方法 |
| --- | --- |
| **読み取り** | Server Component から `src/lib/data/*.ts` の関数を直接呼ぶ |
| **変更** | Server Action（`src/actions/*.ts`）をフォームから呼ぶ |
| **認証コールバック** | Route Handler（`/auth/callback`）— ブラウザからの GET が必要なため |
| **複合的な DB 操作** | Supabase の RPC（`create_household`, `join_household`） |

ここで言う「API」は **Server Action と読み取り関数のシグネチャ**を指す。将来ネイティブアプリなどクライアントが増えたら、その時点で API 層を検討する（→ [ADR-0001](../05-decisions/ADR-0001-tech-stack.md)）。

---

## 2. 共通規約

### 2.1 すべての Server Action が従う 4 ステップ

```ts
"use server";

export async function someAction(formData: FormData): Promise<ActionResult> {
  // ① 認証を確認する（毎回・必ず）
  const me = await requireMember();          // 未認証なら redirect("/login")

  // ② 入力を検証する
  const parsed = parseSomething(formData);
  if (!parsed.ok) return parsed;             // ActionResult のエラーを返す

  // ③ DB を操作する（household_id は me から取る。クライアントの値は使わない）
  const { error } = await supabase.from("...").insert({ ...parsed.value, household_id: me.householdId });
  if (error) return fail("DB_ERROR");

  // ④ 画面を更新する
  refresh();                                  // または redirect("/")
}
```

**①②③④ の順序と省略禁止。** Server Action は UI を経由せず直接 POST できる。詳細 → [セキュリティガイドライン](../03-guidelines/security-guidelines.md)

### 2.2 戻り値の型

```ts
// src/lib/types.ts
export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: ActionError };

export type ActionError = {
  code: ErrorCode;       // 分岐に使う
  message: string;       // 画面に出す日本語
  field?: string;        // 入力エラーのとき、対象の項目名
};
```

- **例外を投げない。** 想定内の失敗（検証エラー、権限なし、見つからない）は `ActionResult` で返す。想定外（DB の障害など）は `code: "UNEXPECTED"` に包む。
- 成功して画面を遷移させる場合は `redirect()` を呼ぶ（戻り値は使われない）。`redirect()` は例外を投げて制御を移すため、**その後のコードは実行されない**。
- `redirect()` を `try` / `catch` の中で呼ばない（例外を飲んでしまう）。

### 2.3 エラーコード

| コード | 意味 | 画面での扱い |
| --- | --- | --- |
| `VALIDATION` | 入力が不正 | 該当項目の下に `message` を表示。`field` で位置を特定 |
| `UNAUTHENTICATED` | 未ログイン | `/login` へ遷移（通常はアクション内で `redirect`） |
| `NO_HOUSEHOLD` | 世帯に未所属 | `/setup` へ遷移 |
| `ALREADY_IN_HOUSEHOLD` | 既に世帯に所属している | メッセージを表示 |
| `INVALID_INVITE_CODE` | 招待コードが存在しない | 招待コード欄にエラーを表示 |
| `NOT_FOUND` | 対象が無い、または自分の世帯のものでない | 「見つかりませんでした」 |
| `DB_ERROR` | DB の操作に失敗 | 「保存できませんでした。もう一度お試しください」 |
| `UNEXPECTED` | 想定外 | 同上 + コンソールに詳細を出す |

**`NOT_FOUND` と権限不足を区別しない。** 他世帯の ID を指定された場合も `NOT_FOUND` を返す。「存在するが権限がない」と答えると ID の存在を漏らす。

### 2.4 メッセージの書き方

| 悪い例 | 良い例 |
| --- | --- |
| `エラーが発生しました` | `保存できませんでした。通信を確認してもう一度お試しください` |
| `Invalid amount` | `金額を入力してください` |
| `Forbidden` | `見つかりませんでした` |

「何が起きたか」と「次にどうすればよいか」を日本語で書く（NFR-U11, FR-X4）。

### 2.5 入力の受け取り方

- フォームからは `FormData` で受け取る（プログレッシブエンハンスメントが効く）。
- `FormData` の値は常に `string | File`。**数値は自分で変換し、変換の失敗を検証エラーとして扱う。**
- 検証は `src/lib/validation.ts` の関数に寄せる。アクションの中に検証ロジックを散らさない。
- v1 では検証ライブラリ（zod 等）を入れない（NFR-M7）。項目数が少なく、手書きの関数で足りる。

---

## 3. 認証

| 事項 | 内容 |
| --- | --- |
| 方式 | Supabase Auth のマジックリンク（メール内のリンク、パスワードなし） |
| セッションの保持 | Cookie（`@supabase/ssr` が管理） |
| トークンの更新 | `src/proxy.ts` で毎リクエスト時に実施 |
| 認証の確認 | `supabase.auth.getUser()`（サーバー側で検証される） |

### 3.1 ヘルパー関数

```ts
// src/lib/auth.ts
/** ログイン中のユーザー。未ログインなら null */
export async function getMe(): Promise<Me | null>;

/** ログイン必須。未ログインなら /login へ redirect */
export async function requireUser(): Promise<Me>;

/** ログイン + 世帯所属が必須。未ログインなら /login、世帯なしなら /setup へ redirect */
export async function requireMember(): Promise<Member>;
```

```ts
export type Me = {
  userId: string;
  email: string | null;
  displayName: string;
  householdId: string | null;
};

/** householdId が確定しているユーザー */
export type Member = Me & { householdId: string };
```

**`requireMember()` を全アクションの 1 行目に置く。** これが世帯 ID の唯一の供給源。

### 3.2 `getUser()` を使い、`getSession()` に頼らない

`getSession()` は Cookie の中身をそのまま返すため、改ざんの検証を伴わない。サーバー側の判断には必ず `getUser()`（または `getClaims()`）を使う。

---

## 4. Server Actions 一覧

### 4.1 認証（`src/actions/auth.ts`）

#### `sendMagicLink(formData)`

| | |
| --- | --- |
| 入力 | `email: string` |
| 認証 | 不要 |
| 処理 | `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo } })` |
| 成功 | `{ ok: true, data: { email } }` → 画面を「送信しました」に差し替える |
| エラー | `VALIDATION`（メール形式）/ `UNEXPECTED` |
| 注意 | **メールアドレスが登録済みかどうかを結果に出さない**（FR-A6, NFR-S7）。Supabase 側のエラーも成功と同じ表示にする |
| 対応要件 | FR-A1 |

`emailRedirectTo` は `${origin}/auth/callback`。この URL を Supabase ダッシュボードの Redirect URLs に登録しておく必要がある。

#### `signOut()`

| | |
| --- | --- |
| 入力 | なし |
| 認証 | 必要 |
| 処理 | `supabase.auth.signOut()` → `redirect("/login")` |
| 対応要件 | FR-A5 |

### 4.2 世帯（`src/actions/household.ts`）

#### `createHousehold(formData)`

| | |
| --- | --- |
| 入力 | `householdName: string`（1〜30 文字）、`displayName: string`（1〜20 文字） |
| 認証 | `requireUser()`（世帯未所属であること） |
| 処理 | `supabase.rpc("create_household", { p_name, p_display_name })` |
| 成功 | `redirect("/")` |
| エラー | `VALIDATION` / `ALREADY_IN_HOUSEHOLD` / `DB_ERROR` |
| 対応要件 | FR-H1, FR-H2 |

初期カテゴリの投入は RPC 側で行う。アプリから個別に INSERT しない。

#### `joinHousehold(formData)`

| | |
| --- | --- |
| 入力 | `inviteCode: string`（6 文字）、`displayName: string` |
| 認証 | `requireUser()` |
| 処理 | 入力を大文字に変換 → `supabase.rpc("join_household", { p_invite_code, p_display_name })` |
| 成功 | `redirect("/")` |
| エラー | `VALIDATION` / `INVALID_INVITE_CODE` / `DB_ERROR` |
| 対応要件 | FR-H1 |

#### `updateHouseholdName(formData)`

| | |
| --- | --- |
| 入力 | `name: string`（1〜30 文字） |
| 認証 | `requireMember()` |
| 処理 | `update households set name = ... where id = me.householdId` |
| 成功 | `refresh()` |
| 対応要件 | FR-H4 |

#### `updateDisplayName(formData)`

| | |
| --- | --- |
| 入力 | `displayName: string`（1〜20 文字） |
| 認証 | `requireMember()` |
| 処理 | `update profiles set display_name = ... where id = me.userId` |
| 注意 | 他メンバーの表示名は変更できない（BR-4）。`where` に自分の ID を入れ、RLS でも担保される |
| 対応要件 | FR-H5 |

### 4.3 記録（`src/actions/transactions.ts`）

#### `createTransaction(formData)`

| | |
| --- | --- |
| 入力 | `kind`（`expense` \| `income`）、`amount`（1〜9,999,999 の整数）、`occurredOn`（`YYYY-MM-DD`）、`categoryId?`（uuid）、`paidBy?`（uuid）、`memo?`（200 文字以内） |
| 認証 | `requireMember()` |
| 検証 | ・`amount` を整数に変換できること、範囲内であること<br>・`occurredOn` が妥当な日付であること<br>・`categoryId` が**自分の世帯の、`kind` が一致する**カテゴリであること<br>・`paidBy` が**自分の世帯のメンバー**であること |
| 処理 | `insert into transactions (...) values (..., household_id: me.householdId, created_by: me.userId)` |
| 成功 | `redirect("/?m=" + 登録した月)` |
| エラー | `VALIDATION`（`field` 付き）/ `DB_ERROR` |
| 対応要件 | FR-T1〜T6, FR-T9 |

**`household_id` と `created_by` はクライアントから受け取らない。** `requireMember()` の戻り値から埋める（BR-5, BR-6）。

`categoryId` / `paidBy` の所属確認は RLS では検出できない（他世帯の ID を入れても `transactions` 側の `with check` は通る）。**アクション内で明示的に確認する。**

#### `updateTransaction(formData)`

| | |
| --- | --- |
| 入力 | `id`（uuid）+ `createTransaction` と同じ項目 |
| 認証 | `requireMember()` |
| 検証 | `createTransaction` と同じ + `id` が自分の世帯の記録であること |
| 処理 | `update transactions set ... where id = :id`（`household_id` と `created_by` は更新しない） |
| 成功 | `redirect("/?m=" + 更新後の月)` |
| エラー | `VALIDATION` / `NOT_FOUND` / `DB_ERROR` |
| 対応要件 | FR-T7 |

UPDATE が 0 行だった場合は `NOT_FOUND` を返す（RLS で弾かれたケースを含む）。

#### `deleteTransaction(formData)`

| | |
| --- | --- |
| 入力 | `id`（uuid） |
| 認証 | `requireMember()` |
| 処理 | `delete from transactions where id = :id` |
| 成功 | `redirect("/")` |
| エラー | `NOT_FOUND` / `DB_ERROR` |
| 注意 | 削除の確認は UI 側で行う（FR-T8）。アクションは確認済みとして動く |
| 対応要件 | FR-T8 |

### 4.4 カテゴリ（`src/actions/categories.ts`）— M4

| アクション | 入力 | 処理 | 要件 |
| --- | --- | --- | --- |
| `createCategory` | `kind`, `name` | INSERT（同名があれば `VALIDATION`） | FR-C3 |
| `renameCategory` | `id`, `name` | UPDATE | FR-C4 |
| `archiveCategory` | `id` | `update categories set archived = true` | FR-C5 |

**削除のアクションを作らない**（BR-7）。

---

## 5. 読み取り関数一覧（`src/lib/data/`）

Server Component から直接呼ぶ。**認可は RLS に任せる**ため、`household_id` の条件は書かない。

| 関数 | 入力 | 戻り値 | 用途 |
| --- | --- | --- | --- |
| `listTransactionsByMonth(month)` | `"2026-11"` | `TransactionRow[]` | `/` の一覧（FR-L1, FR-L2） |
| `getTransaction(id)` | uuid | `TransactionRow \| null` | `/transactions/[id]`（FR-T7） |
| `listCategories(kind)` | `kind` | `Category[]` | `/new` の選択肢（FR-C1, FR-C6） |
| `listMembers()` | — | `Member[]` | 支払った人の選択肢、`/settings`（FR-H6） |
| `getHousehold()` | — | `Household` | `/settings`（FR-H3） |

### 5.1 戻り値の型

```ts
export type TransactionRow = {
  id: string;
  occurred_on: string;          // "2026-11-07"
  kind: "expense" | "income";
  amount: number;               // 円（整数）
  memo: string | null;
  category_id: string | null;
  categories: { name: string } | null;                 // 未分類なら null
  paid_by_profile: { display_name: string } | null;
};
```

DB の列名は **snake_case のまま扱う**（→ [用語集 §3.2](../00-overview/glossary.md#32-db-の列名とコードの変数名)）。

### 5.2 集計はアプリ側で行う

月次合計（FR-L4）は `listTransactionsByMonth` の結果から計算する。専用のクエリを投げない。

```ts
// src/lib/money.ts
export function summarize(rows: TransactionRow[]): { expense: number; income: number; balance: number };
```

---

## 6. Route Handlers

### `GET /auth/callback`

| | |
| --- | --- |
| 入力 | クエリ `code`（PKCE の認可コード）、`error`, `error_description`（失敗時） |
| 処理 | `supabase.auth.exchangeCodeForSession(code)` |
| 成功 | 世帯があれば `/` へ、無ければ `/setup` へ 302 |
| 失敗 | `/login?error=1` へ 302（画面に「リンクが無効または期限切れです」を表示） |
| 対応要件 | FR-A2 |

- `code` が無い場合も失敗として扱う。
- **メールクライアントがリンクを先読みしてコードを消費することがある。** 失敗時は「もう一度ログインリンクを送る」導線を出す。
- Supabase ダッシュボード → Authentication → URL Configuration の **Redirect URLs に `http://localhost:3000/auth/callback` を登録する**。未登録だと弾かれる。

**この Route Handler 以外に API エンドポイントを作らない。** 必要になったら、まずこの文書を更新する。

---

## 7. Supabase RPC

| 関数 | 呼び出し | 引数 | 戻り値 |
| --- | --- | --- | --- |
| `create_household` | `supabase.rpc("create_household", { p_name, p_display_name })` | 世帯名、表示名 | `uuid`（世帯 ID） |
| `join_household` | `supabase.rpc("join_household", { p_invite_code, p_display_name })` | 招待コード、表示名 | `uuid`（世帯 ID） |

- RPC は `raise exception` で失敗を伝える。Supabase クライアントは `error.message` に文字列を入れて返すため、**メッセージの文字列でエラーを分類する**。

| RPC のメッセージ | 対応するエラーコード |
| --- | --- |
| `already belongs to a household` | `ALREADY_IN_HOUSEHOLD` |
| `invalid invite code` | `INVALID_INVITE_CODE` |
| `authentication required` | `UNAUTHENTICATED` |
| その他 | `DB_ERROR` |

定義 → [DB設計 §4](./database-design.md#4-関数とトリガー)

---

## 8. 命名規約

| 対象 | 規則 | 例 |
| --- | --- | --- |
| Server Action | 動詞 + 対象（camelCase） | `createTransaction`, `archiveCategory` |
| 読み取り関数 | `get`（単体）/ `list`（複数） | `getTransaction`, `listCategories` |
| `FormData` のキー | camelCase | `occurredOn`, `categoryId` |
| DB の列 | snake_case | `occurred_on`, `category_id` |

`FormData` のキーと DB の列名が違う点に注意（`occurredOn` → `occurred_on`）。変換はアクションの中で明示的に行う。
