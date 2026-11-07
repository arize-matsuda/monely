# ADR-0003: 1 ユーザー = 1 世帯のデータモデル

| | |
| --- | --- |
| **状態** | 採用（Accepted） |
| **日付** | 2026-11-07 |
| **決定者** | 開発者本人 |
| **関連** | [ADR-0005 認可をアプリ層に置く](./ADR-0005-authorization-in-app-layer.md), [DB設計](../02-design/database-design.md) |

> **根拠が変わった（2026-11-07）** — [ADR-0005](./ADR-0005-authorization-in-app-layer.md) で RLS をやめたため、「ポリシーが 1 行で済む」「関数の裏に隠せば移行できる」という本文の主たる根拠は失効した。**決定自体は維持する**が、現在の根拠は「v1 の要件に複数所属が無い」「世帯切り替え UI が不要で入力が速い」「DAL の `where` が単純になる」である。将来複数世帯に対応する場合、DAL の全関数で「選択中の世帯」を解決する処理が必要になる。

---

## 背景

Monely は世帯（家計簿を共有する単位）にユーザーが所属する構造を持つ。所属の持ち方には 2 つの選択肢がある。

### 案 A: 中間テーブル（多対多）

```
households ─┬─ household_members ─┬─ profiles
```

1 ユーザーが複数の世帯に所属でき、世帯を切り替えられる。一般的な SaaS のテナント構造。

### 案 B: プロフィールに所属を 1 つ持つ（一対多）

```
households ──< profiles (household_id)
```

1 ユーザーは最大 1 つの世帯に所属する。

v1 の要件では、[プロジェクト概要 §5.2](../00-overview/project-overview.md#52-v1-に入れない意図的に落とす) で「1 ユーザーの複数世帯所属」を明確にスコープ外としている。利用者は自分と家族の数人。

---

## 決定

**案 B を採用する。** 所属は `profiles.household_id`（null 可）の単一列で表し、中間テーブルは作らない。

```sql
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  household_id uuid references public.households (id) on delete set null,  -- null = 未所属
  created_at timestamptz not null default now()
);
```

`household_id` が null の状態（サインアップ直後）を正式な状態として扱い、アプリは `/setup` へ誘導する。

---

## 判断の理由

### 1. RLS のポリシーが 1 行で済む

これが決定的な理由。[ADR-0002](./ADR-0002-authorization-via-rls.md) で認可を RLS に置くと決めたため、**ポリシーの単純さがそのままセキュリティの信頼性になる。**

案 B では「今のユーザーの世帯 ID」が 1 回の単純な SELECT で取れる。

```sql
create or replace function public.current_household_id()
returns uuid language sql stable security definer set search_path = public as $$
  select household_id from public.profiles where id = auth.uid();
$$;
```

全テーブルのポリシーが `household_id = public.current_household_id()` の 1 行になる。

案 A では「所属しているか」が `exists (select 1 from household_members where ...)` のサブクエリになり、さらに「どの世帯を見ているか」を決める仕組み（セッション変数、URL のパラメータ、Cookie のいずれか）が必要になる。**選択中の世帯を外部から渡す設計は、そこが新しい攻撃面になる。**

### 2. 要件に無い

v1 で複数世帯所属を必要とする場面が存在しない。利用者は 1 世帯の家族のみ。[プロダクト原則](../01-requirements/product-requirements.md#3-プロダクト原則)の「機能を足すより落とす」に従う。

### 3. 移行できる

将来必要になったら、以下の手順で移行できる。**ポリシーの本体（`household_id = current_household_id()`）は変えずに済む。**

1. `household_members` テーブルを作り、既存の `profiles.household_id` から行を移す。
2. 「選択中の世帯」の保持方法を決める（例: `profiles.active_household_id`）。
3. `current_household_id()` の中身を、選択中の世帯を返す実装に差し替える。
4. `profiles.household_id` を削除する。

**ポリシーを 1 つの関数の裏に隠しておいたことが、この移行を可能にする。** 関数を使わず各ポリシーに直接サブクエリを書いていたら、全ポリシーの書き換えが必要になっていた。

### 4. UI が単純になる

世帯の切り替え UI、「どの世帯に記録するか」の選択、世帯ごとの集計の切り替えが不要になる。入力のタップ数を増やさない（[プロダクト原則 1](../01-requirements/product-requirements.md#3-プロダクト原則)）。

---

## 結果

### 良くなること

- RLS のポリシーが全テーブルで 1 行。誤りが入り込む余地が小さい。
- 「選択中の世帯」を外部から受け取る必要がないため、その攻撃面が存在しない。
- 世帯の切り替え UI が不要。
- `profiles` が `auth.users` と 1:1 のまま保てる。

### 受け入れる代償

| 代償 | 影響 | 対処 |
| --- | --- | --- |
| 1 人が複数世帯を使えない（例: 自分の家と実家の家計簿） | v1 の要件外 | 必要になったら §判断の理由 3 の手順で移行 |
| 世帯から抜けて別の世帯に入る操作が「所属の上書き」になる | 前の世帯の記録は残るが、本人は見られなくなる | v1 では世帯からの離脱機能を作らない |
| 1 つのアカウントを家族で共用すると「誰が払ったか」が記録できない | 招待コードで各自がアカウントを持つ運用で回避 | `/setup` で家族それぞれにログインしてもらう |

### 設計上の帰結

この決定から派生する実装上の約束。

- `profiles.household_id` は **null を取りうる**。型を `string | null` にし、null の場合の遷移（`/setup`）を必ず用意する。
- 世帯 ID を必須とする処理は `requireMember()` を通す。戻り値の型 `Member` で `householdId: string` が確定する（→ [API設計 §3.1](../02-design/api-design.md#31-ヘルパー関数)）。
- 世帯の作成・参加は `profiles.household_id` の更新を伴うため、`create_household()` / `join_household()` の RPC に閉じ込める。
- `create_household()` は「既に世帯に所属していればエラー」とする（所属の上書きを事故で起こさない）。

---

## 見直す条件

| 条件 | 対応 |
| --- | --- |
| 自分の家と実家など、複数の家計簿を 1 つのアカウントで扱いたくなった | 中間テーブルへ移行（手順は §判断の理由 3） |
| 世帯からの離脱・移動機能が必要になった | 離脱時の記録の扱い（残す / 匿名化）を先に決める |
| 1 世帯のメンバーが 10 人を超えた | `profiles` のインデックスと一覧表示を見直す（想定は 2〜4 人） |

---

## 却下した選択肢

| 選択肢 | 却下の理由 |
| --- | --- |
| 中間テーブル（`household_members`） | RLS のポリシーが複雑になり、「選択中の世帯」の保持が新しい攻撃面になる。v1 の要件に無い |
| `profiles` に世帯 ID の配列を持つ | 外部キー制約が効かず、参照整合性を DB で担保できない |
| 世帯を持たず、ユーザー間の共有関係で表現する | 「わが家の家計簿」という概念が表現できない。カテゴリの所有者も決まらない |
