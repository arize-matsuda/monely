import { AuthLink, AuthShell } from "@/components/ui/auth-shell";
import { SignUpForm } from "./signup-form";

export const metadata = { title: "アカウントを作る | Monely" };

export default function SignUpPage() {
  return (
    <AuthShell
      title="アカウントを作る"
      footer={
        <p>
          すでにアカウントをお持ちの方は{" "}
          <AuthLink href="/login">ログイン</AuthLink>
        </p>
      }
    >
      <SignUpForm />
    </AuthShell>
  );
}
