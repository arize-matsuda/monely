# マイグレーションのローカル検証

`0001_init.sql` を**本番の Supabase プロジェクトに触れずに**検証する。

```bash
./supabase/verify/run.sh
```

前提は **Docker が起動していること**だけ。Supabase CLI は使わない（[ADR-0001](../../docs/05-decisions/ADR-0001-tech-stack.md)）。

## 何をするか

1. `postgres:17` の捨てのコンテナを立てる
2. Supabase 環境を模倣する — `auth.users`、`auth.uid()`、`anon` / `authenticated` / `service_role` ロール、**`public` の新規テーブルに `ALL` を付与する既定権限**
3. `0001_init.sql` を **2 回**流す（冪等性の確認）
4. 構造と権限を確認する（RLS 有効、ポリシー 13 本、`security definer` の `search_path`、ロールごとの権限）
5. 機能テスト（サインアップ時の `profiles` 自動生成、招待コードの形式、初期カテゴリ 18 件、二重作成の拒否、`created_by` の偽装拒否、金額の check 制約、招待コードでの参加）
6. **AC-9 RLS 侵入確認** — 別世帯のアカウントから読み取り・更新・削除・`TRUNCATE`・他世帯への書き込みを試す
7. コンテナを削除する

## なぜ必要か

手順 2 の「既定権限の模倣」が要。Supabase は `public` の新規テーブルに `ALL` を付与し、**`ALL` に含まれる `TRUNCATE` は RLS の対象外**。`revoke all` を書かずに `grant` だけ足すと、ログイン済みの誰でも

```sql
truncate public.transactions;   -- 全世帯のデータが消える
```

を実行できる。この穴は**実際にこのスクリプトで見つかった**（2026-11-07）。
→ [DB設計 §5.0](../../docs/02-design/database-design.md#50-テーブル権限先に剥がしてから付け直す)

## いつ流すか

- `supabase/migrations/` に変更を加えたとき（**SQL Editor に貼る前に**）
- テーブルや列を足したとき
- RLS のポリシーや権限をいじったとき

## ファイル

| ファイル | 役割 |
| --- | --- |
| `run.sh` | 一括実行 |
| `00_reset_stub.sql` | リセット + Supabase 環境の模倣。**本番には流さない** |
| `10_structure.sql` | 構造・ポリシー・関数・権限・インデックスの確認 |
| `20_functional.sql` | 機能テスト |
| `30_rls_intrusion.sql` | AC-9 侵入確認 |

## 限界

本物の Supabase ではないため、これだけでは足りない。

- Supabase Auth の挙動（マジックリンク、PKCE、JWT の発行）は模倣していない
- PostgREST 経由のクエリ（`select` の関連埋め込み、エラー形式）は確認できない
- Postgres のバージョンが本番と完全に一致する保証はない

**アプリからの動作確認は別途必要**（[テスト戦略](../../docs/03-guidelines/testing-strategy.md)）。
