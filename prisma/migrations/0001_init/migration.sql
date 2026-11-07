-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "kind" AS ENUM ('expense', 'income');

-- CreateTable
CREATE TABLE "households" (
    "id" UUID NOT NULL,
    "name" VARCHAR(30) NOT NULL,
    "invite_code" VARCHAR(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "households_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "display_name" VARCHAR(20) NOT NULL,
    "household_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "household_id" UUID NOT NULL,
    "kind" "kind" NOT NULL,
    "name" VARCHAR(20) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" UUID NOT NULL,
    "household_id" UUID NOT NULL,
    "occurred_on" DATE NOT NULL,
    "kind" "kind" NOT NULL,
    "amount" INTEGER NOT NULL,
    "category_id" UUID,
    "paid_by" UUID,
    "memo" VARCHAR(200),
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "households_invite_code_key" ON "households"("invite_code");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_user_id_key" ON "profiles"("user_id");

-- CreateIndex
CREATE INDEX "profiles_household_id_idx" ON "profiles"("household_id");

-- CreateIndex
CREATE INDEX "categories_household_id_kind_sort_order_idx" ON "categories"("household_id", "kind", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "categories_household_id_kind_name_key" ON "categories"("household_id", "kind", "name");

-- CreateIndex
CREATE INDEX "transactions_household_id_occurred_on_created_at_idx" ON "transactions"("household_id", "occurred_on" DESC, "created_at" DESC);

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "households"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_paid_by_fkey" FOREIGN KEY ("paid_by") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ---------------------------------------------------------------------------
-- ここから手書き。Prisma schema では CHECK 制約を表現できないため。
-- 主たる検証はアプリ側（src/lib/validation.ts）。これは最終防衛線。
-- → docs/02-design/database-design.md
-- ---------------------------------------------------------------------------

-- 金額は 1 円以上の整数（BR-2 / NFR-D1）
ALTER TABLE "transactions"
  ADD CONSTRAINT "transactions_amount_positive" CHECK ("amount" > 0);

-- 招待コードは 6 桁の英数字（大文字）（BR-9）
ALTER TABLE "households"
  ADD CONSTRAINT "households_invite_code_format" CHECK ("invite_code" ~ '^[A-Z0-9]{6}$');

-- NOT NULL だけでは空文字を防げないため、空でないことを明示する
ALTER TABLE "households"
  ADD CONSTRAINT "households_name_not_blank" CHECK (btrim("name") <> '');
ALTER TABLE "profiles"
  ADD CONSTRAINT "profiles_display_name_not_blank" CHECK (btrim("display_name") <> '');
ALTER TABLE "categories"
  ADD CONSTRAINT "categories_name_not_blank" CHECK (btrim("name") <> '');
