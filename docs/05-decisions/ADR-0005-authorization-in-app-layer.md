# ADR-0005: 認可をアプリ層に置き、Prisma を採用する

| | |
| --- | --- |
| **状態** | 採用（Accepted） |
| **日付** | 2026-11-07 |
| **決定者** | 開発者本人 |
| **置き換える** | [ADR-0002 認可を PostgreSQL の RLS に置く](./ADR-0002-authorization-via-rls.md)（**Superseded**） |
| **一部を更新する** | [ADR-0001 技術スタック](./ADR-0001-tech-stack.md) の「ORM を使わない」「認可を RLS に置く」 |
| **影響を受ける** | [ADR-0003](./ADR-0003-one-household-per-user.md)（決定は維持、根拠が変わる） |

---

## 背景

[ADR-0002](./ADR-0002-authorization-via-rls.md) で認可を PostgreSQL の RLS に置くと決め、[M1](../04-development/implementation-plan.md) でスキーマと 13 本のポリシーを実装した（ローカル検証で `TRUNCATE` の穴を 1 件見つけて修正済み）。

その後、開発者から方針変更の判断があった。**認可をアプリ層に置き、データアクセスを Prisma に寄せる。**

### 判断の背景

開発者はこれまでの個人開発を Prisma のみで進めてきており、その構成に習熟している。一方、RLS を中心に据えた構成では

- DB 定義の 8 割が `schema.prisma` で表現できない要素（ポリシー・`security definer` 関数・`grant`）になる
- 日々のクエリが PostgREST 経由の記法（`supabase.from(...).select("...")`）になり、Prisma の型安全なクエリと使い勝手が異なる
- マイグレーションの運用に Supabase CLI という別のツールチェーンが必要になる

**習熟している道具で速く進められること**は、個人開発では無視できない要素である。使い慣れない構成で手が止まるより、慣れた構成で動くものを作って使い始めるほうが、このプロジェクトの目的（記録が続くかを確かめる）に近い。

---

## 決定

### 1. 認可はアプリ層（Data Access Layer）で行う

すべてのクエリを `src/lib/data/` の関数に集約し、**その中で必ず世帯 ID で絞る**。

```ts
// 認可はここ。householdId はセッションから取り、引数で受け取らない
export async function listTransactionsByMonth(month: string) {
  const me = await requireMember();
  return prisma.transaction.findMany({
    where: {
      householdId: me.householdId,   // ← 守りはこの 1 行
      occurredOn: { gte: start, lt: end },
    },
  });
}
```

### 2. データアクセスは Prisma

| 役割 | 採用 |
| --- | --- |
| スキーマ定義 | `prisma/schema.prisma` |
| マイグレーション | Prisma Migrate（`prisma/migrations/`） |
| クエリ | Prisma Client |
| 接続 | Supabase の Supavisor プーラー（アプリ: transaction mode / マイグレーション: session mode） |

### 3. RLS を使わない

ポリシーを書かない。`supabase/migrations/0001_init.sql` と `supabase/verify/` は削除する（RLS を前提にした資産なので、残すと誤解の種になる）。

### 4. Supabase Auth は維持する

認証（マジックリンク）は変更しない。セッションは `@supabase/ssr` が Cookie で管理し、サーバー側で `supabase.auth.getUser()` でユーザー ID を得る。

- `auth` スキーマは Supabase の所有物なので **Prisma では管理しない**。
- `Profile.userId` は Supabase のユーザー ID を持つ**普通のカラム**（`@unique`）とし、`auth.users` への外部キーは張らない。
- サインアップ時のプロフィール自動生成（旧 `handle_new_user` トリガー）は廃止し、**初回ログイン時にアプリ側で作る**。

### 5. 代償を埋める 3 つの約束

RLS という構造的な保証を手放すため、**それに代わるものを同時に導入する**。これは決定の一部であり、省略できない。

| # | 約束 | 理由 |
| --- | --- | --- |
| **A** | **`prisma` を `src/lib/data/` の外から import しない。** 画面・Server Action は DAL の関数しか呼ばない | 認可の書き忘れが起きる場所を 1 ディレクトリに閉じる |
| **B** | **DAL の関数は世帯 ID を引数で受け取らない。** 関数の中で `requireMember()` から取る | 呼び出し側が他世帯の ID を渡す経路を作らない |
| **C** | **DAL の認可を自動テストで守る。** v1 でテストフレームワーク（Vitest）を導入する | 「書き忘れ」を検出する工程が他に無い。[ADR-0001](./ADR-0001-tech-stack.md) の「v1 ではテストを入れない」を撤回する |

**C を落とすなら、この決定は採用できない。** RLS を外し、かつ検出工程も無い状態は、ADR-0002 で避けたかった状況そのものになる。

---

## 判断の理由

### 認可をアプリ層に置けると判断した根拠

| 項目 | 内容 |
| --- | --- |
| 利用者が限定的 | 自分と家族の数人。招待制で、外部に公開しない |
| 侵害時の影響範囲 | 1 世帯分の家計データ。全世帯分の漏洩というスケールが存在しない（世帯が 1〜2 個） |
| DB に触る経路が 1 つ | Next.js のサーバー側のみ。管理画面・バッチ・外部クライアントが無い |
| クエリの数が少ない | v1 の読み取り関数は 5 本、変更は 10 本程度。全箇所を目で追える規模 |

**ADR-0002 の懸念は消えていない。** 消えていないが、上の 4 点と「約束 A/B/C」で許容範囲に収まる、という判断。

### Prisma を選ぶ理由

- 開発者が習熟している（最大の理由）
- `schema.prisma` 1 ファイルがスキーマの正になり、マイグレーションが自動生成される
- 型安全なクエリ。`select` の記法を覚える必要がない
- リレーションの取得が素直（`include`）。`transactions` から `profiles` への外部キーが 2 本ある問題（どちらを辿るか明示する必要があった）が、`paidBy` / `createdBy` のリレーション名で自然に解ける

---

## 結果

### 良くなること

- 慣れた道具で進められる。手が止まりにくい
- スキーマの正が `prisma/schema.prisma` の 1 ファイルになる（旧構成は 421 行の SQL）
- マイグレーションがバージョン管理され、Web 画面へのコピペが不要になる
- `create_household` RPC（plpgsql 60 行）が Prisma のトランザクション（TypeScript 20 行程度）になる
- 招待コードの生成が `node:crypto` で書ける
- 自動テストが入る（約束 C）。結果として金額・日付のロジックにもテストが付く

### 失うもの（受け入れる代償）

| 失うもの | 影響 | 埋め方 |
| --- | --- | --- |
| **PostgREST に対する行レベルの防御** | Publishable key で REST API を叩かれたときに守るものが無い | `anon` / `authenticated` から `public` の権限を完全に剥奪する（上の注意点 7） |
| **書き忘れが漏洩にならない保証** | `where: { householdId }` が 1 箇所抜けると他世帯のデータが出る | 約束 A/B/C。特に **C（テスト）が唯一の検出工程** |
| DB が最終防衛線でなくなる | アプリのバグがそのまま漏洩になる | 同上 |
| SQL Editor から触っても保護される性質 | 手作業のミスが防げない | 本番 DB を手で触る作業を避ける。変更は必ずマイグレーションで |
| `TRUNCATE` などの権限面の絞り | Prisma は所有者ロールで繋ぐため、そもそも全権を持つ | 接続文字列をアプリ以外に配らない。`.env.local` の管理を厳格にする |
| `created_by` の偽装を DB が拒否する性質 | アプリ側の検証に依存する | DAL で `createdBy` をセッションから埋める（引数で受け取らない） |
| ローカル検証スクリプト（`supabase/verify/`） | 削除する | Vitest による DAL のテストが役割を引き継ぐ |

### 新たに生じる注意点

| # | 注意 |
| --- | --- |
| 1 | **接続文字列は DB の全権を持つ。** Publishable key と同列に扱ってはいけない。`.env.local` 限定、コミット禁止 |
| 2 | Prisma は接続プールを張る。Supabase 無料プランの接続数上限に当たらないよう、開発時は Prisma Client をグローバルに 1 つだけ保つ（Next.js の HMR 対策の定型パターン） |
| 3 | アプリ用は Supavisor の transaction mode（6543 / `pgbouncer=true`）、マイグレーション用は session mode（5432）。直接接続（db.\<ref\>.supabase.co）は無料プランでは IPv6 のみ |
| 4 | `prisma migrate dev` はシャドーデータベースを要求する。Supabase で権限不足になる場合は `shadowDatabaseUrl` を別途用意する（セットアップ時に実地で確認する） |
| 5 | `auth` スキーマを Prisma に introspect させない（`schemas = ["public"]` 相当の設定、または `auth` を触らない運用） |
| 6 | Supabase ダッシュボードに「RLS が無効です」という警告が出続ける。**これは意図した状態**。ただし「あとで有効にしよう」と勘違いしないよう、この ADR へのリンクを README に置く |
| **7** | **Supabase の PostgREST（`/rest/v1/...`）が全テーブルを公開してしまう。** RLS が無く、Supabase の既定権限が `anon` に `ALL` を付けるため、ブラウザに埋め込まれる Publishable key だけで読み取り・挿入・削除ができる状態になっていた（2026-11-07 に実測）。`prisma/migrations/0002_revoke_postgrest_access` で `anon` / `authenticated` から `public` の権限を剥奪し、既定権限も打ち消した。**テーブルを足したら毎回確認する** → [セキュリティガイドライン §2.2](../03-guidelines/security-guidelines.md#22-postgrest-を-public-スキーマから締め出す必須) |

### ADR-0003（1 ユーザー = 1 世帯）への影響

**決定は維持する。** ただし主たる根拠が変わる。

- 旧: 「RLS のポリシーが `household_id = current_household_id()` の 1 行で済む」
- 新: 「v1 の要件に複数所属が無い」「世帯切り替え UI が不要で入力が速い」「DAL の `where` が単純になる」

RLS を使わなくなったため、「ポリシーを関数の裏に隠しておけば移行できる」という利点は消えた。将来複数世帯に対応する場合は、DAL の全関数で「選択中の世帯」を解決する処理が必要になる。

---

## 見直す条件

| 条件 | 対応 |
| --- | --- |
| **他世帯のデータが見えた**（AC-9 が 1 度でも落ちた） | この ADR を疑う。RLS への回帰（ADR-0002 の復活）を検討する |
| 自分以外が開発に入る | 同上。レビュアーがいない前提が変わるのではなく、**書き手が増える**ほうが危険 |
| 利用者が世帯外に広がる / 一般公開する | RLS への回帰を必須とする |
| DB に触る経路が増える（管理画面・バッチ・外部クライアント） | アプリ層の認可では守れなくなる。回帰を検討 |
| 約束 C（テスト）が守られなくなった | 検出工程が消える。**作業を止めて立て直す** |

---

## 却下した選択肢

| 選択肢 | 却下の理由 |
| --- | --- |
| RLS を維持する（ADR-0002 のまま） | 開発者が習熟していない構成で、DB 定義の 8 割が SQL になる。速度と継続性を取って変更した |
| RLS と Prisma を併用（Prisma Client extension で毎クエリ `SET LOCAL ROLE`） | 付け忘れると静かに全部無防備になる。プーラーのモード制約もあり、複雑さの割に保証が弱い |
| Prisma をマイグレーションだけに使い、クエリは supabase-js | スキーマの正が 2 箇所に分かれる。使い勝手の問題（この変更の動機）が解決しない |
| Supabase をやめて素の Postgres + 自前認証 | 認証の自作は事故の確率が高い。マジックリンクのメール送信も自前では面倒（[ADR-0001](./ADR-0001-tech-stack.md) の判断を維持） |
| テストを入れずにアプリ層認可へ移る | 検出工程がゼロになる。約束 C を外した構成は採用しない |
