# Monely ドキュメント

> スマホで数秒で記録できて、家族と同じ家計簿を見られる、自作の家計管理アプリ。

実装の「正」はここに置く。**仕様を変えたらコードと同じコミットでこのディレクトリを直す。** ずれた瞬間にこのドキュメント群の価値は消える。

---

## まずこれを読む

**[00-overview/project-overview.md](./00-overview/project-overview.md)** — 背景、目的、対象ユーザー、スコープ、技術スタック、現在の状態。

## 実装を始める前に必ず読むもの

| 順 | ドキュメント | なぜ |
| --- | --- | --- |
| 1 | [プロジェクト概要](./00-overview/project-overview.md) | 何を作るのか、何を作らないのか |
| 2 | [機能要件](./01-requirements/functional-requirements.md) | 作る対象と受入条件 |
| 3 | [アーキテクチャ](./02-design/architecture.md) | 置き場所と責務、Next.js 16 固有の制約 |
| 4 | [セキュリティガイドライン](./03-guidelines/security-guidelines.md) | **守らないと事故る** |
| 5 | [コーディング規約](./03-guidelines/coding-standards.md) | 命名と実装ルール |

いま何をすべきかは [タスクリスト](./04-development/task-list.md) を見る。

---

## 全ドキュメント

### 00-overview — 全体像

| ファイル | 内容 |
| --- | --- |
| [project-overview.md](./00-overview/project-overview.md) | 背景・目的・対象ユーザー・スコープ |
| [glossary.md](./00-overview/glossary.md) | 用語とコード上の名前の対応表。**命名の正** |

### 01-requirements — 何を作るか

| ファイル | 内容 |
| --- | --- |
| [product-requirements.md](./01-requirements/product-requirements.md) | ユーザー課題・提供価値・MVP の定義 |
| [functional-requirements.md](./01-requirements/functional-requirements.md) | 機能一覧（FR-xx）・業務ルール・受入条件（AC-xx） |
| [non-functional-requirements.md](./01-requirements/non-functional-requirements.md) | 性能・セキュリティ・可用性などの品質基準（NFR-xx） |

### 02-design — どう作るか

| ファイル | 内容 |
| --- | --- |
| [architecture.md](./02-design/architecture.md) | システム構成・ディレクトリ・責務・依存関係・Next.js 16 の制約 |
| [database-design.md](./02-design/database-design.md) | ER 図・テーブル定義・RLS・マイグレーション運用 |
| [api-design.md](./02-design/api-design.md) | Server Actions の仕様・認証・エラー形式 |
| [ui-ux-design.md](./02-design/ui-ux-design.md) | 画面一覧・遷移・ワイヤーフレーム・UI 原則 |

### 03-guidelines — 書くときの約束

| ファイル | 内容 |
| --- | --- |
| [coding-standards.md](./03-guidelines/coding-standards.md) | 命名・ディレクトリ・実装ルール・禁止事項 |
| [testing-strategy.md](./03-guidelines/testing-strategy.md) | 検証方針・手動確認の手順・RLS の侵入確認 |
| [security-guidelines.md](./03-guidelines/security-guidelines.md) | 認証・認可・秘密情報・入力検証 |

### 04-development — 進め方

| ファイル | 内容 |
| --- | --- |
| [implementation-plan.md](./04-development/implementation-plan.md) | マイルストーン（M0〜M5）と依存関係・完成の定義 |
| [task-list.md](./04-development/task-list.md) | 未着手・進行中・完了・ブロッカー。**作業状態の正** |

### 05-decisions — なぜそうしたか

設計判断の記録。**ここに書かれた判断を勝手に変えない。** 変える場合は新しい番号の ADR で置き換え、既存の ADR は書き換えない。

| ADR | 判断 | 状態 |
| --- | --- | --- |
| [ADR-0001](./05-decisions/ADR-0001-tech-stack.md) | 技術スタックの選定（Next.js + Supabase、API 層を作らない） | 採用（一部 ADR-0005 で更新） |
| [ADR-0002](./05-decisions/ADR-0002-authorization-via-rls.md) | 認可を PostgreSQL の RLS に置く | **置き換え済み（ADR-0005）** |
| [ADR-0003](./05-decisions/ADR-0003-one-household-per-user.md) | 1 ユーザー = 1 世帯のデータモデル（中間テーブルを作らない） | 採用 |
| [ADR-0004](./05-decisions/ADR-0004-instant-false-for-authed-segments.md) | 認証後のセグメントを `instant = false` にする | 採用 |
| [**ADR-0005**](./05-decisions/ADR-0005-authorization-in-app-layer.md) | **認可をアプリ層に置き、Prisma を採用する**（ADR-0002 を置き換え） | 採用 |
| [ADR-0006](./05-decisions/ADR-0006-email-password-auth.md) | 認証をメール + パスワードにする（マジックリンクは再設定用に残す） | 採用 |
| [**ADR-0007**](./05-decisions/ADR-0007-better-auth.md) | **認証基盤を Supabase Auth から better-auth に移す** | 採用 |
| [ADR-0008](./05-decisions/ADR-0008-shadcn-ui.md) | UI コンポーネントに shadcn/ui（Radix ベース）を採用する | 採用 |
| [**ADR-0009**](./05-decisions/ADR-0009-desktop-layout-and-category-breakdown.md) | **PC を独立したレイアウトにし、カテゴリ別の内訳を v1 に入れる** | 採用 |
| [ADR-0010](./05-decisions/ADR-0010-year-page.md) | 年のページを作り、月次の推移を v1 に入れる | 採用 |
| [**ADR-0011**](./05-decisions/ADR-0011-tier1-and-recurring.md) | **複製・記録忘れ・支払者別・予算・定期支出を入れる**（v2 候補の前倒し） | 採用 |
| [ADR-0012](./05-decisions/ADR-0012-breakdown-screen.md) | カテゴリ別の内訳を専用画面にし、記録まで辿れるようにする | 採用 |

---

## 目的別の索引

| 知りたいこと | 見る場所 |
| --- | --- |
| この機能は v1 に入るのか | [プロジェクト概要 §5](./00-overview/project-overview.md#5-スコープ) |
| この名前で呼んでいいのか | [用語集](./00-overview/glossary.md) |
| この機能は何をもって完成か | [機能要件 §4 受入条件](./01-requirements/functional-requirements.md#4-受入条件) |
| このファイルはどこに置くのか | [アーキテクチャ §2](./02-design/architecture.md#2-ディレクトリ構成) |
| テーブルに列を足したい | [DB設計 §6](./02-design/database-design.md#6-マイグレーション運用) |
| Server Action をどう書くのか | [API設計 §2.1](./02-design/api-design.md#21-すべての-server-action-が従う-4-ステップ) |
| エラーをどう返すのか | [API設計 §2.2〜2.4](./02-design/api-design.md#22-戻り値の型) |
| 色や余白をどう決めるのか | [UI/UX設計 §6.4](./02-design/ui-ux-design.md#64-デザイントークン) |
| 何を確認したら完了なのか | [テスト戦略 §2〜3](./03-guidelines/testing-strategy.md#2-品質ゲート毎回実行) |
| 他世帯のデータが見えないか確かめたい | [テスト戦略 §4.2](./03-guidelines/testing-strategy.md#42-認可の確認毎回実施) |
| 次に何をやるのか | [タスクリスト](./04-development/task-list.md) |
| なぜこの構成なのか | [05-decisions/](./05-decisions/) |

---

## 技術スタック

| 層 | 選定 |
| --- | --- |
| フレームワーク | Next.js 16.4.5（App Router） |
| UI | React 19 + Tailwind CSS v4 |
| DB | Supabase（PostgreSQL。**認証には使わない**） |
| 認証 | better-auth（Prisma 管理のテーブル） |
| データアクセス | Prisma（スキーマ・マイグレーション・クエリ） |
| 認可 | **アプリ層（`src/lib/data/`）** |
| Lint / Format | Biome |
| パッケージ管理 | pnpm |

**この Next.js は 16.4.5 で、一般的な記事やモデルの学習データと差がある。** 一次情報は `node_modules/next/dist/docs/`（Middleware は `proxy.ts` に改名、`cacheComponents` が有効）。

---

## ドキュメントを書くときのルール

1. **1 つの事実は 1 箇所に書く。** 他のドキュメントからはリンクする。同じ内容を 2 箇所に書くと必ずずれる。
2. **決定と理由を分ける。** 「何をするか」は設計文書、「なぜそうしたか」は ADR。
3. **落とした判断も書く。** 「やらない」と決めたものは理由と見直す条件を残す。後から「考えていなかった」のか「判断して外した」のかが分かる。
4. **ID で参照する。** 機能は `FR-xx`、受入条件は `AC-xx`、品質基準は `NFR-xx`。
5. 仕様を変えたらコードと同じコミットでドキュメントを直す。
