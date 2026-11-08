import { HousePlus, Users } from "lucide-react";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { CreateHouseholdForm, JoinHouseholdForm } from "./setup-forms";

export const metadata = { title: "はじめの設定 | Monely" };

// セッションを読むため、サーバーでブロックして描画する。
//
// **レイアウトの instant = false だけでは足りない。** Page セグメントは
// validationLevel: 'warning'（既定）で暗黙に個別検証されるため、
// 認証後の各ページにも宣言が必要。
// → docs/05-decisions/ADR-0004-instant-false-for-authed-segments.md
export const instant = false;

export default async function SetupPage() {
  const me = await requireUser();
  if (me.householdId) redirect("/");

  return (
    <main className="mx-auto w-full max-w-[480px] flex-1 px-4 py-10">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">
        はじめの設定
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        新しく家計簿を作るか、家族の家計簿に参加します。
      </p>

      <Card className="mt-7 [--card-spacing:--spacing(5)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HousePlus className="size-4 text-muted-foreground" aria-hidden />
            新しく家計簿を作る
          </CardTitle>
          <CardDescription>
            はじめて使う方はこちら。あとから家族を招待できます。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateHouseholdForm defaultDisplayName={me.displayName} />
        </CardContent>
      </Card>

      <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        または
        <span className="h-px flex-1 bg-border" />
      </div>

      <Card className="[--card-spacing:--spacing(5)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="size-4 text-muted-foreground" aria-hidden />
            家族の家計簿に参加する
          </CardTitle>
          <CardDescription>
            すでに家族が作っている場合は、招待コードを入力します。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <JoinHouseholdForm defaultDisplayName={me.displayName} />
        </CardContent>
      </Card>
    </main>
  );
}
