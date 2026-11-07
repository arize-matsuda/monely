# コーディング規約

最終更新: 2026-11-07

**目的: コード品質を揃える。** 判断の揺れを減らすため、迷う箇所だけを決める。Biome が自動で直せることはここに書かない（設定に任せる）。

---

## 1. 前提

| | |
| --- | --- |
| 言語 | TypeScript（strict） |
| Lint / Format | **Biome 2.4.2 のみ。** ESLint も Prettier も入れない |
| インデント | スペース 2（`biome.json` で指定済み） |
| import の整列 | Biome の assist（`organizeImports`）に任せる。手で並べ替えない |
| 実行 | `pnpm lint`（検査）/ `pnpm format`（整形） |

**コミット前に `pnpm lint` と `pnpm build` を通す**（NFR-M1, M2）。

---

## 2. 命名

| 対象 | 規則 | 例 |
| --- | --- | --- |
| ファイル・ディレクトリ | kebab-case | `transaction-row.tsx`, `lib/data/` |
| React コンポーネント | PascalCase | `TransactionRow` |
| 関数・変数 | camelCase | `createTransaction`, `monthStart` |
| 型・インターフェース | PascalCase | `Transaction`, `ActionResult` |
| 定数（モジュールスコープ） | UPPER_SNAKE_CASE | `MAX_MEMO_LENGTH` |
| DB のテーブル・列 | snake_case（テーブル名は複数形） | `transactions`, `occurred_on` |
| `FormData` のキー | camelCase | `occurredOn`, `categoryId` |
| Server Action | 動詞 + 対象 | `createTransaction`, `archiveCategory` |
| 読み取り関数 | `get`（単体）/ `list`（複数） | `getTransaction`, `listCategories` |
| 真偽値 | `is` / `has` / `can` で始める | `isPending`, `hasHousehold` |

ドメイン用語の対応は [用語集](../00-overview/glossary.md) が正。**そこに無い語を新しく使う場合は、先に用語集に追記する。**

### 2.1 DB の列名は変換しない

Supabase から返るオブジェクトは **snake_case のまま扱う**（`occurred_on` を `occurredOn` に変換しない）。変換層を作ると DB と画面の間に対応表が増えて追いにくくなる。アプリ内部で新しく組み立てる値だけ camelCase にする。

---

## 3. ディレクトリとファイルの置き場所

配置のルールは [アーキテクチャ §2](../02-design/architecture.md#2-ディレクトリ構成) が正。要点だけ再掲する。

| 置くもの | 置き場所 |
| --- | --- |
| 画面 | `src/app/**/page.tsx` |
| データの読み取り | `src/lib/data/*.ts` |
| データの変更（Server Action） | `src/actions/*.ts` |
| 画面をまたいで使う UI | `src/components/`（汎用は `components/ui/`） |
| その画面専用の UI | その画面のディレクトリ内に `_components/` |
| 純粋な計算（金額・日付・検証） | `src/lib/*.ts` |
| 型 | `src/lib/types.ts`（共有するもの）、または使う場所の近く |

### 3.1 依存の方向

**`app/` → `actions/` → `lib/` の一方向のみ。** `lib/` から `app/` を import しない。循環が起きそうなら型を `src/lib/types.ts` に移す。

### 3.2 `index.ts` での再 export（barrel file）を作らない

import 元が曖昧になり、循環の原因にもなる。`import { Button } from "@/components/ui/button"` のように実ファイルを指す。

### 3.3 1 ファイルの大きさ

300 行を超えたら分割を検討する（NFR-M6）。ただし分割自体を目的にしない。「別の場所からも使う」「別の責務になっている」のどちらかが理由として言えるときだけ分ける。

---

## 4. TypeScript

| ルール | 理由 |
| --- | --- |
| **`any` を使わない。** 型が分からない場合は `unknown` にして絞り込む | `any` は型チェックを黙らせるだけで、問題を先送りする |
| `as` によるキャストを避ける。使う場合は理由をコメントに書く | 実行時の値と型が食い違う原因になる |
| 関数の戻り値の型は、公開するもの（export するもの）には明示する | 変更時に意図しない型の変化に気づける |
| ローカル変数の型注釈は省略してよい（推論に任せる） | 冗長さを避ける |
| オプショナルより `\| null` を優先する | DB の null と対応が取れる。`undefined` と `null` の両方を扱わない |
| 列挙は union 型（`"expense" \| "income"`）。`enum` は使わない | DB の値と直接対応し、変換が不要 |
| 非 null アサーション（`!`）を避ける。環境変数の読み取りだけ例外とする | 落ちる場所が分からなくなる |

### 4.1 環境変数

```ts
// src/lib/supabase/env.ts
function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`環境変数 ${name} が設定されていません。.env.local を確認してください`);
  return value;
}
```

**`process.env.X!` を散らさない。** 起動時に分かりやすく失敗させる。

---

## 5. React / Next.js

### 5.1 Server / Client の境界

- **既定は Server Component。** `"use client"` は必要な場所にだけ書く。
- Client Component が必要になるのは「入力」「開閉」「タブ切り替え」など**操作の状態を持つ**場合のみ。
- Client Component から `src/lib/data/` を呼ばない。データはサーバーから props で渡す。
- `"use client"` を付けるのは**葉に近いコンポーネント**。親に付けると配下すべてがクライアントに落ちる。

### 5.2 データの取得と変更

- 読み取りは Server Component から `src/lib/data/` を呼ぶ。`useEffect` + `fetch` を使わない。
- 変更は Server Action のみ。`<form action={someAction}>` で呼ぶ（JS が無効でも動く）。
- 変更後の反映は `refresh()`（`next/cache`）または `redirect()`。手でクライアント状態を書き換えない。

### 5.3 React Compiler が有効

`next.config.ts` で `reactCompiler: true`。**`useMemo` / `useCallback` を反射的に書かない。** 必要だと判断した場合は、なぜ必要かをコメントに書く。

### 5.4 Next.js 16 固有

このリポジトリの Next.js は 16.4.5 で、一般的な記事やモデルの学習データと差がある。**一次情報は `node_modules/next/dist/docs/`**（`AGENTS.md` にも明記）。実装前に該当するガイドを読む。

| 事項 | 内容 |
| --- | --- |
| Middleware → `proxy.ts` | `src/proxy.ts`。トークン更新のみ。認可判断を置かない |
| `cacheComponents: true` | `cookies()` を読む箇所に制約。認証後のレイアウトに `export const instant = false` |
| 更新後の反映 | `refresh()` / `revalidatePath()` / `updateTag()` |
| キャッシュキー | **平文で保存される。** 個人情報を入れない |

詳細 → [アーキテクチャ §6](../02-design/architecture.md#6-nextjs-1645-固有の制約)

---

## 6. フォームと検証

- 入力の受け取りは `FormData`。値は常に `string | File` なので、**数値・日付は明示的に変換し、失敗を検証エラーにする。**
- 検証は `src/lib/validation.ts` の関数に寄せる。アクションの中に散らさない。
- 検証ライブラリ（zod 等）を v1 では入れない（NFR-M7）。項目数が少なく、手書きで足りる。
- **クライアント側の検証はサーバー側検証の代わりにならない。** 両方書く（NFR-S8）。

```ts
// 戻り値の形を揃える
export function parseAmount(raw: FormDataEntryValue | null): ParseResult<number>;
```

---

## 7. エラー処理

| 状況 | やり方 |
| --- | --- |
| 想定内の失敗（検証エラー、見つからない、権限なし） | `ActionResult` の `{ ok: false, error }` で返す。**例外を投げない** |
| 想定外の失敗（DB 障害など） | `code: "UNEXPECTED"` に包んで返し、`console.error` に詳細を出す |
| 読み取りで対象が無い | `null` を返し、呼び出し側で表示を分ける |

- **エラーを握りつぶさない。** `catch {}` で何もしないのは、`setAll` の Cookie 書き込み失敗（理由をコメントに書く）だけに限る。
- ユーザーに見せるメッセージは日本語で、「何が起きたか」と「次にどうすればよいか」を書く。
- エラーメッセージに DB のエラー文をそのまま出さない（内部構造が漏れる）。

形式の定義 → [API設計 §2](../02-design/api-design.md#2-共通規約)

---

## 8. 金額と日付

**この 2 つは必ず専用の関数を通す。** 画面ごとに計算・整形を書くと、必ずどこかでずれる。

| 対象 | 置き場所 | 関数の例 |
| --- | --- | --- |
| 金額 | `src/lib/money.ts` | `formatYen(1280)` → `"¥1,280"`、`summarize(rows)` |
| 月 | `src/lib/month.ts` | `monthRange("2026-11")`、`prevMonth()`、`formatMonth()` |
| 日付 | `src/lib/month.ts` | `formatDateLabel("2026-11-07")` → `"11月7日 (金)"` / `"今日"` |

### 8.1 禁止事項

- 金額に浮動小数点の演算を使わない。整数（円）のまま足し引きする。
- 日付に `new Date()` の時刻部分を使わない。文字列 `"YYYY-MM-DD"` と `date` 型で受け渡す。
- `toLocaleDateString()` を画面に直接書かない（`src/lib/` 経由）。
- タイムゾーンに依存する計算をしない。「今日」の算出だけはローカルタイムで行い、関数に閉じ込める。

---

## 9. CSS / Tailwind

- Tailwind CSS v4。ユーティリティクラスを直接書く。CSS ファイルを増やさない。
- **色は CSS 変数（デザイントークン）経由で使う。** `bg-[#10b981]` のような生の色値をコンポーネントに書かない。
- トークンの定義は `src/app/globals.css` の `:root` と `@theme`。ライト / ダークで値を差し替える。
- 余白・文字サイズは Tailwind の既定スケールを使う。独自の値（`p-[13px]`）を作らない。
- クラス名が長くなっても、条件分岐のない限り変数に逃がさない（検索性を保つ）。

トークン一覧 → [UI/UX設計 §6.4](../02-design/ui-ux-design.md#64-デザイントークン)

---

## 10. コメント

| 書くべきもの | 書かないもの |
| --- | --- |
| **なぜ**そうしたか（他の選択肢を選ばなかった理由） | 何をしているか（コードを読めば分かること） |
| 直感に反する処理の理由 | 関数名の言い換え |
| 外部仕様の制約（Supabase や Next.js の挙動） | TODO の放置（やるなら [タスクリスト](../04-development/task-list.md) に書く） |
| セキュリティ上、省略できない処理の理由 | 変更履歴（git にある） |

```ts
// 良い例
// Server Component のレンダリング中は Cookie を書けない。
// セッションの更新は proxy.ts が担保するので、ここでは無視してよい。
try { ... } catch { }
```

日本語で書く。英語に訳す手間をかける価値がない。

---

## 11. Git

| 事項 | 規則 |
| --- | --- |
| ブランチ | `main` に直接コミットしてよい（1 人開発）。大きな変更は作業ブランチを切る |
| コミットの粒度 | 1 つの変更 = 1 コミット。マイルストーン単位でまとめない |
| コミットメッセージ | 日本語。1 行目に何をしたか（例: `記録の登録アクションを追加`） |
| **仕様の変更** | コードと `docs/` を**同じコミット**に入れる（NFR-M4） |
| コミットしないもの | `.env.local`、`node_modules/`、`.next/` |
| `AGENTS.md` の変更 | `next dev` が自動で書き戻すため、差分が出たら作業と一緒にコミットする |

---

## 12. 依存パッケージ

**追加する前に止まって考える。** 個人開発では、依存の更新が止まった時点で負債になる（NFR-M7）。

| 判断 | 条件 |
| --- | --- |
| 入れてよい | 標準機能とフレームワークの機能では実現できない。かつ、広く使われ更新が続いている |
| 入れない | 数十行の自作で足りる。UI ライブラリで見た目を揃えたいだけ |
| 必須 | 追加する場合は [ADR](../05-decisions/) を 1 本書く |

現在の依存: `next`, `react`, `react-dom`, `@supabase/supabase-js`, `@supabase/ssr`（+ dev の Biome / Tailwind / TypeScript）。

---

## 13. 禁止事項（チェックリスト）

実装後に確認する。1 つでも該当したら直す。

- [ ] `any` を使っていない
- [ ] `service_role` キーを参照していない（`grep -rn service_role src/`）
- [ ] Server Action の中で認証を確認している（例外なし）
- [ ] クライアントから受け取った `household_id` / `created_by` を DB に書いていない
- [ ] 金額に浮動小数点の演算を使っていない
- [ ] 生の色値（`#rrggbb`）をコンポーネントに書いていない
- [ ] `catch {}` で理由なく例外を捨てていない
- [ ] `console.log` を残していない（`console.error` は可）
- [ ] 用語集に無い新しい言葉を使っていない
