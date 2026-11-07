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
| **進行中のマイルストーン** | M0（未着手） |
| **次にやること** | M0-1 スキャフォールドの残骸を削除 |
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

### 未着手

- [ ] M0-1 スキャフォールドの残骸を削除（`src/app/page.tsx` の既定の中身、`public/*.svg`）
- [ ] M0-2 `README.md` を Monely の内容に書き換える（`docs/` への導線を入れる）
- [ ] M0-3 ルートレイアウトを整える（`lang="ja"`、メタデータ、日本語フォント、`viewport`）
- [ ] M0-4 デザイントークンを `globals.css` に定義（ライト / ダーク）
- [ ] M0-5 `.env.local.example` を作成
- [ ] M0-6 `.gitignore` に `!.env.local.example` を追加
- [ ] M0-7 `pnpm lint` / `pnpm build` を通す
- [ ] M0-8 コミット（Supabase の依存追加分を含む）

### 完了

（なし）

---

## M1 — Supabase プロジェクトと DB スキーマ

### 未着手

- [ ] M1-1 Supabase に無料プロジェクトを作る（**手作業**）
- [ ] M1-2 `supabase/migrations/0001_init.sql` を書く — テーブル 4 つ
- [ ] M1-3 同 — `current_household_id()`、`handle_new_user()`、`touch_updated_at()`
- [ ] M1-4 同 — `create_household()`、`join_household()`（初期カテゴリの投入を含む）
- [ ] M1-5 同 — RLS ポリシー（4 テーブル分）
- [ ] M1-6 SQL Editor で実行する
- [ ] M1-7 2 回続けて実行してもエラーが出ないことを確認（冪等性）
- [ ] M1-8 Redirect URLs に `http://localhost:3000/auth/callback` を登録（**手作業**）
- [ ] M1-9 `.env.local` に URL と公開キーを設定
- [ ] M1-10 [テスト戦略 §4.1](../03-guidelines/testing-strategy.md#41-スキーマと-rls-の確認m1) のチェックリストを実施

### 完了

（なし）

### 適用済みマイグレーション

| ファイル | 適用日 | 備考 |
| --- | --- | --- |
| （なし） | | |

> 適用状況を DB 側で管理しないため、ここに記録する。

---

## M2 — 認証と世帯

### 未着手

- [ ] M2-1 `src/lib/supabase/env.ts`（環境変数の読み取り）
- [ ] M2-2 `src/lib/supabase/server.ts` / `client.ts`
- [ ] M2-3 `src/proxy.ts`（セッション更新。**`setAll` の第 2 引数のヘッダを設定する**）
- [ ] M2-4 `src/lib/types.ts`（`Me`, `Member`, `ActionResult`, `ActionError`）
- [ ] M2-5 `src/lib/auth.ts`（`getMe` / `requireUser` / `requireMember`）
- [ ] M2-6 `src/lib/validation.ts`（検証ヘルパーの土台）
- [ ] M2-7 `/login` 画面
- [ ] M2-8 `sendMagicLink` アクション（**登録有無を漏らさない**）
- [ ] M2-9 `/auth/callback` Route Handler（失敗時の表示を含む）
- [ ] M2-10 `/setup` 画面
- [ ] M2-11 `createHousehold` / `joinHousehold` アクション
- [ ] M2-12 `(app)/layout.tsx`（振り分け + `export const instant = false`）
- [ ] M2-13 `signOut` アクション
- [ ] M2-14 仮のホーム画面
- [ ] M2-15 受入条件 AC-1, AC-2, AC-3, AC-11 を実施
- [ ] M2-16 **受入条件 AC-9（RLS の侵入確認）を実施**
- [ ] M2-17 `pnpm lint` / `pnpm build` を通してコミット

### 完了

（なし）

---

## M3 — 記録と一覧（v1 の本体）

### 未着手

- [ ] M3-1 `src/lib/money.ts`（`formatYen`, `parseAmount`, `summarize`）
- [ ] M3-2 `src/lib/month.ts`（`monthRange`, `prevMonth`, `nextMonth`, `formatMonth`, `formatDateLabel`）
- [ ] M3-3 `src/lib/data/transactions.ts`（`listTransactionsByMonth`, `getTransaction`, `listCategories`）
- [ ] M3-4 `src/lib/data/household.ts`（`listMembers`, `getHousehold`）
- [ ] M3-5 ホーム画面 — 月切り替え（`?m=` の読み取り、不正値の扱い）
- [ ] M3-6 ホーム画面 — 月次合計の表示
- [ ] M3-7 ホーム画面 — 日付グループ化した一覧
- [ ] M3-8 ホーム画面 — 空表示
- [ ] M3-9 `createTransaction` アクション（検証・**参照先の所属確認**・INSERT）
- [ ] M3-10 `/new` — 種別タブ、金額入力（Client Component）
- [ ] M3-11 `/new` — カテゴリ選択
- [ ] M3-12 `/new` — 折りたたみ項目（日付・支払った人・メモ）
- [ ] M3-13 `updateTransaction` / `deleteTransaction` アクション
- [ ] M3-14 `/transactions/[id]` — 編集フォーム
- [ ] M3-15 `/transactions/[id]` — 削除（確認付き）、見つからない表示
- [ ] M3-16 エラー表示（入力エラー・保存失敗で入力が消えないこと）
- [ ] M3-17 受入条件 AC-4〜AC-8 を実施
- [ ] M3-18 **受入条件 AC-9 を再実施**
- [ ] M3-19 [テスト戦略 §4.3](../03-guidelines/testing-strategy.md#43-金額と日付の確認m3)（金額と日付の確認。**全角数字を含む**）
- [ ] M3-20 入力速度の計測（10 秒 / 5 タップ以内）
- [ ] M3-21 `pnpm lint` / `pnpm build` を通してコミット
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

```markdown
### M0 確認結果（2026-11-xx）
- pnpm lint: OK
- pnpm build: OK
- 画面表示: OK
- 残課題: なし
```

（まだ記録なし）
