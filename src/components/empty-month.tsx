import { NotebookPen, Plus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

/** 記録が 0 件の月（FR-L6）。中央に「記録する」への導線を出す */
export function EmptyMonth() {
  return (
    <Empty className="rounded-xl border border-dashed border-border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <NotebookPen aria-hidden />
        </EmptyMedia>
        <EmptyTitle>まだ記録がありません</EmptyTitle>
        <EmptyDescription>
          買い物のあと、金額を打つだけで残せます。
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button asChild size="lg">
          <Link href="/new">
            <Plus aria-hidden />
            記録する
          </Link>
        </Button>
      </EmptyContent>
    </Empty>
  );
}
