-- 毎月くり返す支出の印（FR-R1）
-- → docs/05-decisions/ADR-0011-tier1-and-recurring.md
--
-- **列の追加のみ。** 既定値 false なので既存の行は影響を受けない。
-- NOT NULL + DEFAULT の追加は Postgres 11 以降テーブルを書き換えないため、
-- 行数が増えても一瞬で終わる。

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN "recurring" BOOLEAN NOT NULL DEFAULT false;

-- 定期の候補を引くクエリ用。部分インデックスにして、
-- recurring = false の大多数の行をインデックスに載せない
CREATE INDEX "transactions_recurring_idx"
  ON "transactions" ("household_id", "occurred_on" DESC)
  WHERE "recurring";
