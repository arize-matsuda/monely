-- カテゴリごとの月予算（FR-B1〜B3）
-- → docs/05-decisions/ADR-0011-tier1-and-recurring.md
--
-- 既存のテーブルには一切触らない（追加のみ）。
-- anon / authenticated への権限は 0002 の `alter default privileges` が
-- 打ち消しているので、このテーブルにも付かない。
-- → 適用後に testing-strategy §4.2 の確認で 0 件であることを見る。

-- CreateTable
CREATE TABLE "budgets" (
    "id" UUID NOT NULL,
    "household_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "amount" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "budgets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
-- 1 カテゴリに 1 件。世帯も入れて他世帯のカテゴリと衝突しないようにする
CREATE UNIQUE INDEX "budgets_household_id_category_id_key" ON "budgets"("household_id", "category_id");

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ---------------------------------------------------------------------------
-- ここから手書き。Prisma schema では CHECK 制約を表現できないため。
-- 主たる検証はアプリ側（src/lib/validation.ts）。これは最終防衛線。
-- ---------------------------------------------------------------------------

-- 予算は 1 円以上。0 は「予算なし」として行を消す運用にする
ALTER TABLE "budgets"
  ADD CONSTRAINT "budgets_amount_positive" CHECK ("amount" > 0);

-- 金額の上限はアプリと揃える（MAX_AMOUNT = 9,999,999）
ALTER TABLE "budgets"
  ADD CONSTRAINT "budgets_amount_max" CHECK ("amount" <= 9999999);
