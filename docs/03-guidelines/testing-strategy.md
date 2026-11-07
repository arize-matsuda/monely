# テスト戦略

最終更新: 2026-11-07

**目的: 検証を確実に実施させる。** 「動いたはず」で終わらせないため、何をどう確かめるかを手順として固定する。

> **2026-11-07 に方針が変わった。** [ADR-0005](../05-decisions/ADR-0005-authorization-in-app-layer.md) で認可を DB（RLS）からアプリ層に移したため、**自動テストが「あると安心」から「無いと設計が成立しない」に変わった**。

---

## 1. 方針

### 1.1 認可のテストは必須（約束 C）

認可が `src/lib/data/` の `where` 句にしか無い。**書き忘れを検出する工程は自動テストだけ。**

| 対象 | 扱い |
| --- | --- |
| **DAL の認可** | **必須。** テストの無い DAL 関数をマージしない |
| 金額・日付・検証のロジック | 必須に近い。壊れると全画面に波及する |
| 画面の表示・操作 | 手動確認で足りる（v1） |
| 認証フロー（マジックリンク） | 手動確認（メール受信を伴うため自動化しにくい） |

### 1.2 道具

| | |
| --- | --- |
| テストランナー | **Vitest**（M3 で導入。[ADR-0005](../05-decisions/ADR-0005-authorization-in-app-layer.md) 約束 C） |
| DB | **Docker のローカル Postgres**。本番の Supabase には繋がない |
| E2E | v1 では入れない（§6 の条件を満たしたら検討） |

**なぜローカル Postgres が必要か**: 認可のテストは「別世帯のデータが取れないこと」を確かめるもので、本物のクエリを本物の DB に投げないと意味がない。モックでは `where` の書き忘れを検出できない。

### 1.3 以前の方針を撤回した理由

[ADR-0001](../05-decisions/ADR-0001-tech-stack.md) では「v1 ではテストを入れない。使われないテストは腐る」としていた。これは**認可を DB が保証していた前提**での判断。その前提が消えたので撤回した。

---

## 2. 品質ゲート（毎回実行）

マイルストーンの完了前、およびコミット前に必ず通す。

```bash
pnpm lint     # Biome。違反 0 であること
pnpm build    # 型エラー・ビルドエラー 0 であること
pnpm test     # Vitest。全件通ること（M3 以降）
```

| コマンド | 検出できるもの | 検出できないもの |
| --- | --- | --- |
| `pnpm lint` | 書き方の逸脱、未使用の変数 | 動作の誤り |
| `pnpm build` | 型の不整合、Server/Client 境界の違反 | 実行時の誤り |
| `pnpm test` | **認可の書き忘れ**、計算の誤り | 画面の崩れ、認証フロー |

加えて、grep による静的チェックを回す（[セキュリティガイドライン §10](./security-guidelines.md#10-実装後のチェックリスト)）。

```bash
# PostgREST が塞がっているか（401 であること）。マイグレーションを適用したら毎回
set -a && . ./.env.local && set +a
curl -s -o /dev/null -w "%{http_code}\n" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" \
  "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/transactions?select=id&limit=1"

# 約束 A: prisma を DAL の外から import していないか（0 件であること）
grep -rn "data/db" src --include="*.ts" --include="*.tsx" | grep -v "^src/lib/data/"

# DATABASE_URL を db.ts 以外から参照していないか（0 件であること）
grep -rn "DATABASE_URL" src/ | grep -v "src/lib/data/db.ts"

# 生の SQL を使っていないか（0 件であること）
grep -rn "queryRawUnsafe\|executeRawUnsafe" src/
```

---

## 3. 自動テストの構成

### 3.1 ローカル DB の用意

```bash
# 使い捨ての Postgres を起動し、マイグレーションを適用する
./scripts/test-db.sh up
```

- `postgres:17` のコンテナを立て、`prisma migrate deploy` でスキーマを作る
- 接続先は `.env.test` の `DATABASE_URL`（`localhost:55432`）
- テストの前後で各テーブルを truncate する

> **本番の Supabase には絶対に繋がない。** `.env.test` の `DATABASE_URL` が localhost を指していることをテストの起動時に確認する。

### 3.2 認可テストの型

DAL の関数ごとに、少なくとも次の 3 つを書く。

```ts
// src/lib/data/transactions.test.ts
describe("listTransactionsByMonth", () => {
  it("自分の世帯の記録を返す", async () => { /* ... */ });

  it("他世帯の記録を返さない", async () => {
    const { a, b } = await seedTwoHouseholds();   // A に記録 1 件、B は空
    await asMember(b.member, async () => {
      expect(await listTransactionsByMonth("2026-11")).toHaveLength(0);
    });
  });
});

describe("getTransaction", () => {
  it("他世帯の記録は ID 指定でも null", async () => {
    const { a, b } = await seedTwoHouseholds();
    await asMember(b.member, async () => {
      expect(await getTransaction(a.transactionId)).toBeNull();
    });
  });
});

describe("updateTransactionForMe / deleteTransactionForMe", () => {
  it("他世帯の記録を更新・削除できない", async () => {
    const { a, b } = await seedTwoHouseholds();
    await asMember(b.member, async () => {
      await expect(updateTransactionForMe(a.transactionId, { amount: 1 }))
        .resolves.toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    });
    // A の記録が無傷であることも確認する
    expect(await rawFindAmount(a.transactionId)).toBe(1280);
  });
});
```

`asMember()` は `requireMember()` が返す値を差し替えるヘルパー（認証のモック）。**DB へのクエリはモックしない。**

### 3.3 テストを足すタイミング

| 操作 | 必要なテスト |
| --- | --- |
| DAL に読み取り関数を足した | 「他世帯のデータを返さない」 |
| DAL に変更関数を足した | 「他世帯のデータを変更できない」＋「対象が無傷」 |
| モデルに列を足した | 既存のテストが通ることを確認 |
| `src/lib/money.ts` / `month.ts` に関数を足した | 境界値のテスト |

---

## 4. 手動確認

自動テストで覆えない範囲を手で確かめる。[機能要件 §4 の受入条件（AC-1〜AC-12）](../01-requirements/functional-requirements.md#4-受入条件)がその一覧。

### 4.1 環境

```bash
pnpm dev          # http://localhost:3000
```

| 事項 | 内容 |
| --- | --- |
| ブラウザ | Chrome の DevTools デバイスモードで **iPhone SE（375 × 667）** を基準にする |
| アカウント | 2 つ用意する（自分のメール + 別のメール。エイリアスでも可） |
| DB | 本番の Supabase に接続している（NFR-O3）。**確認で入れたデータは後で消す** |

### 4.2 認可の確認（毎回実施）

自動テストがあっても、**アプリ全体を通した経路**は手でも確かめる。自動テストは DAL 単体、これは画面・アクション・DAL を通した確認。

#### 準備

1. アカウント **A** でログイン → 世帯 A を作る → 記録を 1 件入れる（例: 食費 ¥1,280）
2. その記録の ID を控える（一覧から編集画面を開き、URL の `/transactions/<id>` を見る）
3. ログアウト
4. アカウント **B**（別のメールアドレス）でログイン → **世帯 B を新規作成する**（A の招待コードは使わない）

#### 確認

| # | 操作 | 期待する結果 |
| --- | --- | --- |
| 1 | B で `/` を開く | A の記録が 1 件も出ない。支出合計が ¥0 |
| 2 | B で `/?m=<A の記録の月>` を開く | 同様に 1 件も出ない |
| 3 | B で `/transactions/<A の記録の ID>` を直接開く | 「見つかりませんでした」。**金額やカテゴリが一瞬でも表示されない** |
| 4 | B で `/settings` を開く | メンバー一覧に B のみ。招待コードは B のもの |
| 5 | B のセッションで A の記録の更新・削除を試す | 失敗する。A の記録が無傷 |

#### #5 の試し方

編集画面が開けないため、Server Action を直接呼ぶ必要がある。B でログインした状態の DevTools から、編集フォームの POST を模倣する。

または、同じ内容を自動テスト（§3.2）で確認できていれば、手動は #1〜#4 に留めてよい。

#### 失敗したときの対応

1 つでも期待どおりでなかった場合、**他の作業を止めて先に直す**。原因は次のいずれかが多い。

| 症状 | 疑う箇所 |
| --- | --- |
| 他世帯のデータが見える | DAL のクエリに `householdId` の条件が無い |
| 他世帯の記録を更新できる | `update({ where: { id } })` を使っている（`updateMany` で世帯条件を付ける） |
| 他世帯のカテゴリ・メンバーを紐付けられる | 参照先の所属確認が無い（[セキュリティガイドライン §4.4](./security-guidelines.md#44-参照先の所属も確認する)） |
| 画面を迂回して書き込める | Server Action の先頭で `requireMember()` を呼んでいない |

**[ADR-0005](../05-decisions/ADR-0005-authorization-in-app-layer.md) の「見直す条件」に該当する。** AC-9 が落ちたら、RLS への回帰も検討する。

### 4.3 スキーマとマイグレーションの確認（M1）

```bash
pnpm db:status          # 適用済みのマイグレーションを確認
```

- [ ] `prisma/migrations/` のすべてが適用済みと表示される
- [ ] Supabase の Table Editor に 4 テーブルが見える
- [ ] CHECK 制約が入っている（下の SQL）
- [ ] Authentication → URL Configuration の Redirect URLs に `http://localhost:3000/auth/callback` がある
- [ ] **Publishable key で `/rest/v1/<テーブル>` を叩いて 401 / 42501 になる**（[セキュリティガイドライン §2.2](./security-guidelines.md#22-postgrest-を-public-スキーマから締め出す必須)）

```sql
-- CHECK 制約の確認。5 件あること
select conname, pg_get_constraintdef(oid)
from pg_constraint
where contype = 'c' and connamespace = 'public'::regnamespace
order by conname;
```

> Supabase ダッシュボードの「RLS が無効です」警告は**意図した状態**（[DB設計 §9](../02-design/database-design.md#9-supabase-ダッシュボードの-rls-警告について)）。

### 4.4 金額と日付の確認（M3）

計算のずれは静かに起きるため、必ず**手計算と突き合わせる**。境界値は自動テストにも入れる。

- [ ] 1 件ずつ金額をメモしながら 5 件入れ、支出合計が手計算と一致する
- [ ] 収入を 1 件入れ、差額 = 収入 − 支出 になっている
- [ ] 月末（10月31日）と月初（11月1日）の記録が、それぞれ正しい月に入る
- [ ] 月を移動しても、前の月の記録が混ざらない
- [ ] `0`、`-100`、`12.5`、空文字、`1280円`、`１２８０`（全角）を金額に入れて保存を試す → すべて弾かれる
- [ ] 9,999,999 を超える金額が弾かれる
- [ ] 日付を未来（来月）にして保存できる。その月に表示される
- [ ] **一覧の日付見出しが、入力した日付と一致する**（`@db.Date` の UTC 問題。[DB設計 §5.2](../02-design/database-design.md#52-dbdate-の読み出しに注意)）

**全角数字と日付のずれを必ず試す。** どちらも静かに壊れる類。

### 4.5 入力速度の確認（M3 / M4）

ストップウォッチで測る（NFR-P3, NFR-U2）。

- [ ] 起動から保存完了まで **10 秒以内**
- [ ] タップ数（キーボードの打鍵を除く）が **5 回以内**

### 4.6 スマホでの確認（M4）

- [ ] 幅 375px / 320px で崩れない
- [ ] 下部タブが固定され、セーフエリアに潜らない
- [ ] 金額欄をタップすると数値キーボードが開く
- [ ] タップ対象が 44px 以上
- [ ] OS をダークモードにすると配色が追従し、文字が読める
- [ ] 実機（iPhone）で 1 件記録できる

### 4.7 エラー時の確認（M3）

- [ ] DevTools の Network を Offline にして保存 → エラーが表示され、**入力内容が残っている**
- [ ] 存在しない ID で `/transactions/xxxx` を開く → 「見つかりませんでした」
- [ ] `/?m=abc` を開く → 当月が表示される
- [ ] 無効な招待コードで参加を試す → 招待コード欄にエラーが出る

### 4.8 PWA の確認（M5）

- [ ] 「ホーム画面に追加」ができ、全画面で開く
- [ ] アイコンが意図したものになっている
- [ ] 起動後にログイン状態が保持されている

---

## 5. マイルストーンごとの確認範囲

| マイルストーン | 自動テスト | 手動確認 |
| --- | --- | --- |
| M0 | — | 画面表示、lint / build |
| M1 | — | §4.3 |
| M2 | 認証ヘルパー（`requireMember`） | AC-1, AC-2, AC-3, AC-11, **§4.2** |
| M3 | **DAL の全関数 + money / month / validation** | AC-4〜AC-8, §4.4, §4.5, **§4.2** |
| M4 | 追加した DAL 関数 | AC-10, AC-12, **§4.2** |
| M5 | — | §4.8 |

**§4.2（認可の確認）は M2 以降、毎回実施する。**

---

## 6. 将来の自動化

| 条件 | 導入するもの |
| --- | --- |
| 手動確認が 15 分を超えた | Playwright（AC-4, AC-7, **AC-9** の自動化） |
| 同じ不具合を 2 回出した | その箇所の回帰テスト |
| 自分以外が開発に入る | CI（`lint` / `build` / `test` を push ごとに） |

**AC-9 の E2E 自動化は優先度が高い。** DAL 単体のテストは通っても、画面やアクションの経路で漏れる可能性が残る。

---

## 7. 記録テンプレート

マイルストーン完了時に [タスクリスト](../04-development/task-list.md) へ貼る。

```markdown
### M3 確認結果（2026-11-xx）
- pnpm lint: OK
- pnpm build: OK
- pnpm test: OK（DAL 認可テスト 12 件、money/month 18 件）
- AC-4 記録の登録: OK
- AC-7 月の移動と集計: OK（手計算と一致）
- §4.2 認可の確認: OK（B から A の記録が見えない）
- §4.4 日付: OK（全角数字を弾ける、日付見出しがずれない）
- 入力速度: 8 秒 / 4 タップ
- 残課題: なし
```
