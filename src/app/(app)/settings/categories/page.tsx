import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { listCategoriesForManagement } from "@/lib/data/categories";
import { AddCategoryForm } from "./add-category-form";
import { CategoryRow } from "./category-row";

export const metadata = { title: "カテゴリの管理 | Monely" };

// セッションを読むため、サーバーでブロックして描画する。
// 認証後の各ページに宣言が必要（レイアウトだけでは足りない）。
// → docs/05-decisions/ADR-0004-instant-false-for-authed-segments.md
export const instant = false;

/**
 * カテゴリの管理（FR-C3〜C5）。
 *
 * **設定画面の中ではなく別ページにした。** 行ごとに改名と非表示の操作が
 * 付くので、設定画面に折りたたんで入れると縦に長くなりすぎる
 * （UI/UX設計 §4.6 で「M4 で決める」としていた判断）。
 *
 * **削除は用意しない。** 消すと過去の記録のカテゴリ名が失われる（FR-C6）。
 * 使わなくなったものは「非表示」にする。
 */
export default async function CategoriesPage() {
  const categories = await listCategoriesForManagement();
  const expense = categories.filter((c) => c.kind === "expense");
  const income = categories.filter((c) => c.kind === "income");

  return (
    <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col gap-4 px-4 pt-4 pb-4 md:max-w-3xl md:px-8 md:pt-8">
      <div className="flex items-center gap-1">
        <Button asChild variant="ghost" size="icon" className="-ml-2">
          <Link href="/settings" aria-label="設定に戻る">
            <ArrowLeft aria-hidden />
          </Link>
        </Button>
        <h1 className="font-heading text-lg font-semibold tracking-tight">
          カテゴリの管理
        </h1>
      </div>

      {/* PC では支出と収入を横に並べる（縦に長くなるのを防ぐ） */}
      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-2 lg:items-start">
        <Section title="支出" kind="expense" categories={expense} />
        <Section title="収入" kind="income" categories={income} />
      </div>

      <p className="px-1 text-xs leading-relaxed text-muted-foreground">
        カテゴリは削除できません。非表示にすると新しい記録では選べなくなりますが、
        過去の記録には名前が残ります。
      </p>
    </main>
  );
}

function Section({
  title,
  kind,
  categories,
}: {
  title: string;
  kind: "expense" | "income";
  categories: Awaited<ReturnType<typeof listCategoriesForManagement>>;
}) {
  const visible = categories.filter((c) => !c.archived);
  const archived = categories.filter((c) => c.archived);

  return (
    <Card className="[--card-spacing:--spacing(4)]">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          {visible.length} 件
          {archived.length > 0 ? `（非表示 ${archived.length} 件）` : null}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        {visible.map((category) => (
          <CategoryRow
            key={category.id}
            id={category.id}
            name={category.name}
            archived={category.archived}
            transactionCount={category._count.transactions}
          />
        ))}

        {archived.length > 0 ? (
          <>
            <p className="mt-3 px-1 text-xs font-medium text-muted-foreground">
              非表示
            </p>
            {archived.map((category) => (
              <CategoryRow
                key={category.id}
                id={category.id}
                name={category.name}
                archived={category.archived}
                transactionCount={category._count.transactions}
              />
            ))}
          </>
        ) : null}

        <AddCategoryForm kind={kind} />
      </CardContent>
    </Card>
  );
}
