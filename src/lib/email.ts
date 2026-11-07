import "server-only";

/**
 * メール送信。
 *
 * better-auth はメールを送らない（送信関数を渡す設計）ので、ここで用意する。
 *
 * | 条件 | 動作 |
 * | --- | --- |
 * | RESEND_API_KEY がある | Resend の REST API に fetch で送る（パッケージを追加しない） |
 * | 鍵が無い（開発時） | **コンソールにリンクを出力する** |
 *
 * 開発時にコンソールへ出すのは、メールの往復と送信制限を待たずにテストするため。
 * → docs/05-decisions/ADR-0007-better-auth.md
 */

export type Mail = {
  to: string;
  subject: string;
  /** 本文。リンクを含む場合は URL をそのまま入れる */
  text: string;
};

export async function sendMail(mail: Mail): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;

  if (!apiKey || !from) {
    logToConsole(mail);
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [mail.to],
      subject: mail.subject,
      text: mail.text,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    // 宛先アドレスは出さない（個人情報をログに残さない）
    console.error("[sendMail] Resend への送信に失敗", response.status, detail);
    throw new Error("メールを送信できませんでした");
  }
}

function logToConsole(mail: Mail): void {
  console.info(
    [
      "",
      "────────────────────────────────────────────────────────",
      " メール送信（開発モード: RESEND_API_KEY が未設定）",
      ` 宛先  : ${mail.to}`,
      ` 件名  : ${mail.subject}`,
      "",
      mail.text,
      "────────────────────────────────────────────────────────",
      "",
    ].join("\n"),
  );
}
