import { X } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * `/new` と編集画面のヘッダー（UI/UX設計 §4.2 のワイヤー）。
 *
 * **閉じる（✕）は画面の左上に置く。** 下部タブを置かない画面なので、
 * 戻る導線をここに固定する。下部は保存ボタンの場所。
 */
export function FormPageHeader({ title }: { title: string }) {
  return (
    <div className="mb-4 flex items-center gap-1">
      <Button asChild variant="ghost" size="icon" className="-ml-2">
        <Link href="/" aria-label="閉じてホームに戻る">
          <X aria-hidden />
        </Link>
      </Button>
      <h1 className="font-heading text-lg font-semibold tracking-tight">
        {title}
      </h1>
    </div>
  );
}
