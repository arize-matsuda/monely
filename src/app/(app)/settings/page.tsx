import {
  ChevronRight,
  Home,
  KeyRound,
  Palette,
  Tags,
  Users,
} from "lucide-react";
import Link from "next/link";
import { signOut } from "@/actions/auth";
import { renameHousehold, renameMe } from "@/actions/household";
import { BottomTabs } from "@/components/bottom-tabs";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { requireMember } from "@/lib/auth";
import { getMyHousehold, listMembers } from "@/lib/data/household";
import { InlineRename } from "./inline-rename";
import { PasswordForm } from "./password-form";

// セッションを読むため、サーバーでブロックして描画する。
//
// **レイアウトの instant = false だけでは足りない。** Page セグメントは
// validationLevel: 'warning'（既定）で暗黙に個別検証されるため、
// 認証後の各ページにも宣言が必要。
// → docs/05-decisions/ADR-0004-instant-false-for-authed-segments.md
export const instant = false;

export const metadata = { title: "設定 | Monely" };

/**
 * 設定画面。M4 で世帯名の変更・表示名の変更・カテゴリ管理を足す。
 * パスワードの変更（FR-A10）は、マジックリンクで作ったアカウントに
 * パスワードを設定する必要があるため M2 の段階で用意した。
 */
export default async function SettingsPage() {
  const me = await requireMember();
  const [household, members] = await Promise.all([
    getMyHousehold(),
    listMembers(),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col gap-4 px-4 pt-8 pb-28">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">
        設定
      </h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="size-4 text-muted-foreground" aria-hidden />
            わが家
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <InlineRename
            action={renameHousehold}
            label="名前"
            name="householdName"
            value={household?.name ?? ""}
            maxLength={30}
          />

          <Separator />

          <div>
            <p className="text-sm font-medium">招待コード</p>
            <p className="mt-1 font-mono text-2xl tracking-[0.2em]">
              {household?.inviteCode}
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              このコードを家族に伝えると、同じ家計簿に参加できます。
              パスワードと同じ扱いで共有してください。
            </p>
          </div>

          <Separator />

          <div>
            <p className="flex items-center gap-2 text-sm font-medium">
              <Users className="size-4 text-muted-foreground" aria-hidden />
              メンバー
            </p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {members.map((member) => (
                <li key={member.id}>
                  <Badge
                    variant={
                      member.id === me.profileId ? "default" : "secondary"
                    }
                  >
                    {member.displayName}
                    {member.id === me.profileId ? "（あなた）" : null}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>あなた</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <InlineRename
            action={renameMe}
            label="表示名"
            name="displayName"
            value={me.displayName}
            maxLength={20}
            hint="一覧で「支払った人」として表示されます。過去の記録の表示も変わります"
          />

          <Separator />

          <dl className="flex justify-between gap-4 text-sm">
            <dt className="text-muted-foreground">メール</dt>
            <dd className="truncate">{me.email}</dd>
          </dl>
        </CardContent>
      </Card>

      {/* カテゴリは行ごとに操作が付くので別ページにした（UI/UX設計 §4.6） */}
      <Card className="[--card-spacing:--spacing(0)]">
        <Link
          href="/settings/categories"
          className="flex min-h-14 items-center gap-2 px-4 transition-colors hover:bg-muted/60"
        >
          <Tags className="size-4 text-muted-foreground" aria-hidden />
          <span className="flex-1 font-heading text-base font-medium">
            カテゴリの管理
          </span>
          <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
        </Link>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="size-4 text-muted-foreground" aria-hidden />
            表示テーマ
          </CardTitle>
          <CardDescription>
            「システム」は端末の設定に合わせます。この端末にだけ保存されます。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ThemeToggle />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="size-4 text-muted-foreground" aria-hidden />
            パスワード
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PasswordForm />
        </CardContent>
      </Card>

      <form action={signOut} className="mt-2">
        <Button type="submit" variant="outline" className="w-full">
          ログアウト
        </Button>
      </form>

      <BottomTabs />
    </main>
  );
}
