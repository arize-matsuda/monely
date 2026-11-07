# ADR-0004: 認証後のセグメントを `instant = false` にする

| | |
| --- | --- |
| **状態** | 採用（Accepted） |
| **日付** | 2026-11-07 |
| **決定者** | 開発者本人 |
| **関連** | [ADR-0001 技術スタック](./ADR-0001-tech-stack.md), [アーキテクチャ §6](../02-design/architecture.md#6-nextjs-1645-固有の制約) |

---

## 背景

このリポジトリの Next.js は **16.4.5** で、`next.config.ts` で以下が有効になっている（スキャフォールドの既定）。

```ts
const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
};
```

`cacheComponents` が有効な場合、**リクエスト時のデータ（`cookies()` / `headers()`）を読むコンポーネントは静的シェルにプリレンダリングできない**。同梱ドキュメント（`node_modules/next/dist/docs/01-app/02-guides/authentication-with-cache-components.md`）は次の扱いを定めている。

> With Cache Components enabled, a session read happens at request time, so it can't be prerendered into the static shell. Authenticated UI streams in behind a `<Suspense>` boundary instead.

さらに、既定（`validationLevel: 'warning'`）では**すべての Page セグメントが開発時に検証され**、ナビゲーションを即時にできない箇所が開発オーバーレイに警告として出る。

Monely は Supabase Auth のセッションを Cookie で持つ。**ログイン後の全画面が `cookies()` の読み取りを伴う。** したがって、何らかの対応が必要になる。

### 選択肢

| 案 | 内容 |
| --- | --- |
| A | 各画面を `<Suspense>` で包み、セッションを読む部分を境界の内側に押し込む |
| B | `use cache: private` でセッション由来のデータをブラウザ側にキャッシュし、プリフェッチを効かせる |
| C | 認証後のセグメントに `export const instant = false` を宣言し、サーバーでブロックして描画する |
| D | `next.config.ts` の `cacheComponents` を無効にする |

---

## 決定

**案 C を採用する。** `src/app/(app)/layout.tsx` に以下を置く。

```tsx
export const instant = false;
```

これにより、認証後のセグメント配下は instant navigation の検証と静的シェルの検証の対象から外れ、サーバーでブロックして描画する素直な構成になる。

**`cacheComponents` は無効にしない。** スキャフォールドの構成を維持する。

---

## 判断の理由

### 1. プリレンダリングできる部分が実質的に存在しない

Monely のログイン後の画面は、月次一覧・記録フォーム・設定のすべてが個人データ。静的シェルに入れられるのは画面の枠だけで、**先出しによる体感の改善がほとんど無い。**

一方で、案 A（Suspense 境界）を全画面に適用すると、

- 各画面にフォールバック UI（スケルトン）を設計・実装する必要がある
- レイアウトの最上位で `await` できなくなるため、認証の振り分け（未ログイン → `/login`、世帯なし → `/setup`）を境界の内側のコンポーネントに押し込む構造になる
- 認可の判断箇所が分散し、[セキュリティガイドライン](../03-guidelines/security-guidelines.md)の「振り分けを 1 箇所にまとめる」方針と衝突する

**得られるものが小さく、払うものが大きい。**

### 2. 案 B（`use cache: private`）は v1 には早い

セッション由来のデータをキャッシュすると、データを更新した直後の表示が古いままになる経路が生まれる。`cacheLife` と `updateTag` の設計が必要になり、**正しく動かすための考慮が増える。**

v1 の目的は「記録が続くかを確かめる」ことで、利用者は数人。**まず正しく動かし、実測で困ってから最適化する**（[非機能要件 §2](../01-requirements/non-functional-requirements.md#2-性能nfr-p)の「やらないこと」）。

### 3. 案 D（`cacheComponents` を無効化）は選ばない

スキャフォールドが有効にしている設定を戻すと、`partialPrefetching` など関連する設定との整合を自分で確認する必要が出る。また、将来 `use cache` による最適化に進む道を自分で閉じることになる。

**`instant = false` は、同梱ドキュメントが明示している正式な逃げ道**であり、設定の無効化よりも局所的で可逆。

> Set `export const instant = false` on the page or layout to let it keep blocking on the server, then adopt the patterns below one route at a time.

### 4. 段階的に外せる

`instant = false` はセグメント単位の宣言。将来、特定の画面だけ `<Suspense>` + `use cache` に移行し、その画面で `instant = true` に切り替えることができる。**全体を一度に書き換える必要がない。**

---

## 決定の範囲

| 対象 | 宣言 | 理由 |
| --- | --- | --- |
| `src/app/(app)/layout.tsx` | `export const instant = false` | 配下の `/`、`/new`、`/transactions/[id]`、`/settings` をまとめて対象にする |
| `src/app/login/page.tsx` | 宣言しない | セッションを読まない（送信結果の表示のみ） |
| `src/app/setup/page.tsx` | 必要なら宣言する | セッションを読むため。M2 で実装時に判断 |
| `src/app/layout.tsx`（ルート） | **宣言しない** | ルートに置くとアプリ全体の静的シェル検証が外れる。同梱ドキュメントが「できるだけ低い位置に置く」と指示している |

---

## 結果

### 良くなること

- 認証の振り分けをレイアウトの最上位の 1 箇所に書ける。認可の判断箇所が分散しない。
- フォールバック UI（スケルトン）を設計しなくてよい。M3 の実装量が減る。
- コードが素直になる（`await` して `redirect()` するだけ）。
- 段階的に最適化へ移行できる。

### 受け入れる代償

| 代償 | 影響 | 対処 |
| --- | --- | --- |
| 画面遷移が即時にならない（サーバーの応答を待つ） | 利用者数人・1 世帯の規模では体感上の問題になりにくい見込み | M3 / M4 で実測する。遅いと感じたら案 A / B に移行 |
| App Shell によるプリフェッチの恩恵を受けられない | 同上 | 同上 |
| 将来 `instant = true` に移行するとき、Suspense 境界の設計が必要になる | 移行コストが後ろにずれる | セグメント単位で段階的に移行できる |
| 開発時の検証による気づきが得られない | ナビゲーションを遅くする変更に気づきにくい | 代わりに実測（NFR-P1: 一覧の表示 1.5 秒以内）で判断する |

---

## 見直す条件

| 条件 | 対応 |
| --- | --- |
| 画面遷移が体感で遅い（NFR-P1 / NFR-P2 を満たせない） | 一覧画面だけ `<Suspense>` + `use cache: private` に移行し、`instant = true` にする |
| 利用者が増え、サーバーの応答が不安定になる | 同上 |
| Next.js のバージョンを上げて `instant` の仕様が変わった | 同梱ドキュメントを読み直し、この ADR を新しい番号で置き換える |
| 公開ページ（ログイン前のランディング等）を作る | そのページは静的シェルの対象として設計する（`instant = false` を広げない） |

---

## 守らなければならない前提

- `instant = false` を **ルートレイアウトに置かない**。アプリ全体の静的シェル検証が外れる。
- `use cache` を使う場合、キャッシュキーとタグに個人情報を入れない（平文で保存される。[セキュリティガイドライン §8.2](../03-guidelines/security-guidelines.md#82-キャッシュキーに個人情報を入れない)）。
- 素の `use cache` の中で `cookies()` / `headers()` を読まない（例外になる）。読むなら `use cache: private`。

---

## 却下した選択肢

| 選択肢 | 却下の理由 |
| --- | --- |
| A: 全画面を `<Suspense>` で包む | プリレンダリングできる部分が実質無く、得られるものが小さい。認可の判断箇所が分散する |
| B: `use cache: private` でキャッシュする | 更新直後に古い表示が出る経路が生まれる。v1 の段階では考慮が増えるだけ |
| D: `cacheComponents` を無効にする | 関連設定との整合を自分で確認する必要が出る。将来の最適化の道を閉じる。局所的でない |
