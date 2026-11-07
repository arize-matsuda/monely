# API 設計（Server Actions / Route Handlers）

最終更新: 2026-11-07

**目的: インターフェースを統一する。** 入力・出力・エラーの形を 1 つに決めて、画面側の扱いを揃える。

---

## 1. 前提: REST API は作らない

Monely のクライアントは同じ Next.js アプリだけ。HTTP の API 層を作ると、型定義・検証・エラー処理が二重になる。

| 操作 | 実現方法 |
| --- | --- |
| **読み取り** | Server Component から `src/lib/data/*.ts`（DAL）の関数を呼ぶ |
| **変更** | Server Action（`src/actions/*.ts`）→ DAL の関数 |
| **認証コールバック** | Route Handler（`/auth/callback`）— ブラウザからの GET が必要なため |
| **複合的な DB 操作** | DAL 内の Prisma トランザクション（`prisma.$transaction`） |

ここで言う「API」は **Server Action と DAL のシグネチャ**を指す。将来ネイティブアプリなどクライアントが増えたら、その時点で API 層を検討する（→ [ADR-0001](../05-decisions/ADR-0001-tech-stack.md)）。

> **DAL（`src/lib/data/`）が認可の本体。** `prisma` をここ以外から import しない。関数は世帯 ID を引数で受け取らない。→ [セキュリティガイドライン §4](../03-guidelines/security-guidelines.md#4-認可--3-つの約束)

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

  // ③ DAL を呼ぶ（householdId / createdById は DAL が me から埋める）
  await createTransactionForMe(parsed.value);

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
| `DB_ERROR` | DB の操作に失敗（Prisma の例外を包む） | 「保存できませんでした。もう一度お試しください」 |
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
| 方式 | メールアドレス + パスワード（**better-auth** → [ADR-0007](../05-decisions/ADR-0007-better-auth.md)）。パスワードを忘れたときはマジックリンク |
| セッションの保持 | `session` テーブル + Cookie（better-auth が管理） |
| セッションの検証 | `auth.api.getSession({ headers })`。同じ DB への 1 クエリ |


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
  /** Supabase Auth のユーザー ID */
  userId: string;
  /** Monely 側の Profile.id。Transaction.paidById などが参照する */
  profileId: string;
  email: string | null;
  displayName: string;
  householdId: string | null;
};

/** householdId が確定しているユーザー */
export type Member = Me & { householdId: string };
```

> `userId`（Supabase）と `profileId`（Monely）は**別の値**。混同しない → [用語集](../00-overview/glossary.md)

**`requireMember()` を全アクションの 1 行目に置く。** これが世帯 ID の唯一の供給源。

### 3.2 `getUser()` を使い、`getSession()` に頼らない

`getSession()` は Cookie の中身をそのまま返すため、改ざんの検証を伴わない。サーバー側の判断には必ず `getUser()`（または `getClaims()`）を使う。

---

## 4. Server Actions 一覧

### 4.1 認証（`src/actions/auth.ts`）

#### `signIn(prev, formData)`

| | |
| --- | --- |
| 入力 | `email`, `password` |
| 認証 | 不要 |
| 処理 | `supabase.auth.signInWithPassword({ email, password })` |
| 成功 | `redirect("/")` |
| エラー | `VALIDATION` / `UNAUTHENTICATED`（「メールアドレスまたはパスワードが正しくありません」）/ `UNEXPECTED` |
| 注意 | **どちらが違うかを示さない**（FR-A8） |
| 対応要件 | FR-A1 |

#### `signUp(prev, formData)`

| | |
| --- | --- |
| 入力 | `email`, `password`（8 文字以上）, `passwordConfirmation` |
| 認証 | 不要 |
| 処理 | `supabase.auth.signUp({ email, password, options: { emailRedirectTo } })` |
| 成功 | `{ ok: true, data: { email } }` → 「確認メールを送りました」に差し替える |
| エラー | `VALIDATION`（形式・長さ・確認の不一致・`weak_password`）/ `UNEXPECTED` |
| 注意 | **登録済みかどうかを結果に出さない**（FR-A9）。Supabase は既存のアドレスに何も送らずに成功を返す |
| 対応要件 | FR-A2, FR-A3 |

#### `resendVerificationEmail(prev, formData)`

| | |
| --- | --- |
| 入力 | `email` |
| 認証 | 不要 |
| 処理 | `auth.api.sendVerificationEmail({ body: { email, callbackURL: "/" } })` |
| 成功 | `{ ok: true, data: { email } }` |
| 注意 | **登録済み／確認済みかどうかを出さない**（FR-A9） |
| 対応要件 | FR-A13 |

未確認のままログインを試した場合も、`emailVerification.sendOnSignIn` により自動で再送される。

#### `sendMagicLink(prev, formData)`

| | |
| --- | --- |
| 入力 | `email` |
| 認証 | 不要 |
| 処理 | `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo, shouldCreateUser: false } })` |
| 成功 | `{ ok: true, data: { email } }` → 「リンクを送りました」に差し替える |
| 注意 | **登録済みかどうかを出さない**（FR-A9）。`shouldCreateUser: false` でリンク経由の新規登録を禁じる |
| 対応要件 | FR-A6（パスワードを忘れたときの導線） |

`emailRedirectTo` は `${origin}/auth/callback`。この URL を Supabase ダッシュボードの Redirect URLs に登録しておく必要がある。

#### `signOut()`

| | |
| --- | --- |
| 入力 | なし |
| 認証 | 必要 |
| 処理 | `supabase.auth.signOut()` → `redirect("/login")` |
| 対応要件 | FR-A7 |

### 4.2 世帯（`src/actions/household.ts`）

#### `createHousehold(formData)`

| | |
| --- | --- |
| 入力 | `householdName: string`（1〜30 文字）、`displayName: string`（1〜20 文字） |
| 認証 | `requireUser()`（世帯未所属であること） |
| 処理 | DAL の `createHouseholdForMe({ name, displayName })` — `prisma.$transaction` で世帯作成 + 初期カテゴリ 18 件 + 自分の所属更新 |
| 成功 | `redirect("/")` |
| エラー | `VALIDATION` / `ALREADY_IN_HOUSEHOLD` / `DB_ERROR` |
| 対応要件 | FR-H1, FR-H2 |

世帯作成・初期カテゴリ投入・所属更新を 1 つのトランザクションで行う（途中で失敗して中途半端な状態が残らないように）。

#### `joinHousehold(formData)`

| | |
| --- | --- |
| 入力 | `inviteCode: string`（6 文字）、`displayName: string` |
| 認証 | `requireUser()` |
| 処理 | 入力を大文字に変換 → DAL の `joinHouseholdForMe({ inviteCode, displayName })` |
| 成功 | `redirect("/")` |
| エラー | `VALIDATION` / `INVALID_INVITE_CODE` / `DB_ERROR` |
| 対応要件 | FR-H1 |

#### `updateHouseholdName(formData)`

| | |
| --- | --- |
| 入力 | `name: string`（1〜30 文字） |
| 認証 | `requireMember()` |
| 処理 | DAL の `updateHouseholdName(name)` — `where: { id: me.householdId }` |
| 成功 | `refresh()` |
| 対応要件 | FR-H4 |

#### `updateDisplayName(formData)`

| | |
| --- | --- |
| 入力 | `displayName: string`（1〜20 文字） |
| 認証 | `requireMember()` |
| 処理 | DAL の `updateMyDisplayName(name)` — `where: { id: me.profileId }` |
| 注意 | 他メンバーの表示名は変更できない（BR-4）。`where` に自分の `profileId` を入れる。**これが唯一の担保** |
| 対応要件 | FR-H5 |

### 4.3 記録（`src/actions/transactions.ts`）

#### `createTransaction(formData)`

| | |
| --- | --- |
| 入力 | `kind`（`expense` \| `income`）、`amount`（1〜9,999,999 の整数）、`occurredOn`（`YYYY-MM-DD`）、`categoryId?`（uuid）、`paidBy?`（uuid）、`memo?`（200 文字以内） |
| 認証 | `requireMember()` |
| 検証 | ・`amount` を整数に変換できること、範囲内であること<br>・`occurredOn` が妥当な日付であること<br>・`categoryId` が**自分の世帯の、`kind` が一致する**カテゴリであること<br>・`paidBy` が**自分の世帯のメンバー**であること |
| 処理 | DAL の `createTransactionForMe(input)` — `householdId: me.householdId`, `createdById: me.profileId` を DAL が埋める |
| 成功 | `redirect("/?m=" + 登録した月)` |
| エラー | `VALIDATION`（`field` 付き）/ `DB_ERROR` |
| 対応要件 | FR-T1〜T6, FR-T9 |

**`householdId` と `createdById` はクライアントから受け取らない。** `requireMember()` の戻り値から埋める（BR-5, BR-6）。

`categoryId` / `paidById` の所属確認は外部キーでは検出できない（他世帯の ID でも行は存在する）。**DAL で明示的に確認する**（→ [セキュリティガイドライン §4.4](../03-guidelines/security-guidelines.md#44-参照先の所属も確認する)）。

#### `updateTransaction(formData)`

| | |
| --- | --- |
| 入力 | `id`（uuid）+ `createTransaction` と同じ項目 |
| 認証 | `requireMember()` |
| 検証 | `createTransaction` と同じ + `id` が自分の世帯の記録であること |
| 処理 | DAL の `updateTransactionForMe(id, input)` — `updateMany({ where: { id, householdId: me.householdId } })`。`householdId` と `createdById` は更新しない |
| 成功 | `redirect("/?m=" + 更新後の月)` |
| エラー | `VALIDATION` / `NOT_FOUND` / `DB_ERROR` |
| 対応要件 | FR-T7 |

`updateMany` の `count` が 0 なら `NOT_FOUND` を返す。**`update({ where: { id } })` を使わない**（世帯の条件を付けられず、他世帯の記録を更新できてしまう）。

#### `deleteTransaction(formData)`

| | |
| --- | --- |
| 入力 | `id`（uuid） |
| 認証 | `requireMember()` |
| 処理 | DAL の `deleteTransactionForMe(id)` — `deleteMany({ where: { id, householdId: me.householdId } })` |
| 成功 | `redirect("/")` |
| エラー | `NOT_FOUND` / `DB_ERROR` |
| 注意 | 削除の確認は UI 側で行う（FR-T8）。アクションは確認済みとして動く |
| 対応要件 | FR-T8 |

### 4.4 カテゴリ（`src/actions/categories.ts`）— M4

| アクション | 入力 | 処理 | 要件 |
| --- | --- | --- | --- |
| `createCategory` | `kind`, `name` | `create`（一意制約違反は `VALIDATION`） | FR-C3 |
| `renameCategory` | `id`, `name` | `updateMany({ where: { id, householdId } })` | FR-C4 |
| `archiveCategory` | `id` | 同上で `archived: true` | FR-C5 |

**削除のアクションを作らない**（BR-7）。

---

## 5. DAL の関数一覧（`src/lib/data/`）

Server Component / Server Action から呼ぶ。**すべての関数が内部で `requireMember()` を呼び、`householdId` で絞る。**

| 関数 | 入力 | 戻り値 | 用途 |
| --- | --- | --- | --- |
| `listTransactionsByMonth(month)` | `"2026-11"` | `TransactionRow[]` | `/` の一覧（FR-L1, FR-L2） |
| `getTransaction(id)` | uuid | `TransactionRow \| null` | `/transactions/[id]`（FR-T7） |
| `listCategories(kind)` | `kind` | `Category[]` | `/new` の選択肢（FR-C1, FR-C6） |
| `listMembers()` | — | `Profile[]` | 支払った人の選択肢、`/settings`（FR-H6） |
| `getHousehold()` | — | `Household` | `/settings`（FR-H3） |

### 5.1 戻り値の型

Prisma が生成する型を使う。`include` の内容に応じた型が推論される。

```ts
export type TransactionRow = Prisma.TransactionGetPayload<{
  include: {
    category: { select: { name: true } };
    paidBy: { select: { displayName: true } };
  };
}>;
```

フィールド名は **camelCase**（`occurredOn`, `categoryId`）。DB 側は `@map` で snake_case。

**`occurredOn` は `Date` 型で返る（UTC 0 時）。** 整形は必ず UTC で行う → [DB設計 §5.2](./database-design.md#52-dbdate-の読み出しに注意)

### 5.2 すべての関数に認可テストを付ける

DAL に関数を 1 つ足したら、「他世帯のデータを返さない / 変更できない」テストを同じコミットで足す。→ [セキュリティガイドライン §4.3](../03-guidelines/security-guidelines.md#43-約束-c-dal-の認可を自動テストで守る)

### 5.3 集計はアプリ側で行う

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
| 対応要件 | FR-A2（新規登録の確認）, FR-A6（ログインリンク） |

- **2 つの用途を共用する。** 新規登録の確認リンクとログインリンクはどちらも PKCE なので同じ処理になる。
- `code` が無い場合も失敗として扱う。
- **メールクライアントがリンクを先読みしてコードを消費することがある。** 失敗時は「もう一度ログインリンクを送る」導線を出す。
- Supabase ダッシュボード → Authentication → URL Configuration の **Redirect URLs に `http://localhost:3000/auth/callback` を登録する**。未登録だと弾かれる。

**この Route Handler 以外に API エンドポイントを作らない。** 必要になったら、まずこの文書を更新する。

---

## 7. トランザクション

複数のテーブルにまたがる変更は `prisma.$transaction` で囲む。旧構成の `security definer` RPC（`create_household` / `join_household`）はアプリ側のトランザクションに置き換えた。

```ts
// src/lib/data/household.ts
export async function createHouseholdForMe(input: { name: string; displayName: string }) {
  const me = await requireUser();
  if (me.householdId) return fail("ALREADY_IN_HOUSEHOLD");

  return prisma.$transaction(async (tx) => {
    const household = await tx.household.create({
      data: { name: input.name, inviteCode: await generateUniqueInviteCode(tx) },
    });
    await tx.category.createMany({
      data: INITIAL_CATEGORIES.map((c) => ({ ...c, householdId: household.id })),
    });
    await tx.profile.update({
      where: { id: me.profileId },
      data: { householdId: household.id, displayName: input.displayName },
    });
    return household;
  });
}
```

- 招待コードの生成は `node:crypto`（`randomInt`）を使う。**`Math.random()` を使わない**。
- 一意制約違反（`P2002`）で再試行するか、事前に存在確認する。

## 8. 命名規約

| 対象 | 規則 | 例 |
| --- | --- | --- |
| Server Action | 動詞 + 対象（camelCase） | `createTransaction`, `archiveCategory` |
| DAL の読み取り | `get`（単体）/ `list`（複数） | `getTransaction`, `listCategories` |
| DAL の変更 | 動詞 + 対象 + `ForMe` | `createTransactionForMe`, `updateHouseholdName` |
| `FormData` のキー | camelCase | `occurredOn`, `categoryId` |
| Prisma のフィールド | camelCase | `occurredOn`, `categoryId` |
| DB の列（`@map` 後） | snake_case | `occurred_on`, `category_id` |

`ForMe` の接尾辞は「セッションの世帯に対する操作」であることを示す。**接尾辞が無い変更関数を作らない**（世帯 ID を引数で受け取る関数が生まれるのを防ぐ）。
