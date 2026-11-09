import "server-only";

/**
 * メール送信。
 *
 * better-auth はメールを送らない（送信関数を渡す設計）ので、ここで用意する。
 *
 * | 条件 | 動作 |
 * | --- | --- |
 * | RESEND_API_KEY と MAIL_FROM がある | Resend の REST API に fetch で送る（パッケージを追加しない） |
 * | どちらか欠けている | **コンソールにリンクを出力する**（送信はしない） |
 *
 * 開発時にコンソールへ出すのは、メールの往復と送信制限を待たずにテストするため。
 * → docs/05-decisions/ADR-0007-better-auth.md
 *
 * **本番で未設定のまま動かすと「送ったつもり」になる。** 画面には
 * 「メールを送りました」と出るのに 1 通も届かない。実際に本番で踏んだ
 * （2026-11-09）。そのため `isMailConfigured()` を公開し、
 * 画面側が未設定であることを利用者に伝えられるようにしている。
 */

export type Mail = {
  to: string;
  subject: string;
  /** 本文。リンクを含む場合は URL をそのまま入れる */
  text: string;
};

/**
 * メール送信が設定されているか。**画面に出す警告の判定に使う。**
 *
 * 未設定だと送信は行われず、リンクはサーバーのログに出るだけになる。
 * ログは利用者から見えないので、**画面で先に伝える**必要がある。
 */
export function isMailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM);
}

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

/**
 * 開発モードの出力。
 *
 * **リンクを最後の行に単独で置く。** 前回、リンクの後ろに本文が続いていたため、
 * ターミナルからコピーしたときに後続の文字まで含まれ、
 * better-auth が `Invalid callbackURL` で弾いた。
 *
 * あわせて `.dev-mail.log` にも書く。dev サーバーの標準出力がどこへ行っても
 * リンクを取り出せるようにするため（gitignore 済み）。
 */
function logToConsole(mail: Mail): void {
  const url = mail.text.match(/https?:\/\/\S+/)?.[0];
  const production = process.env.NODE_ENV === "production";

  const block = [
    "",
    production
      ? "──────── メールを送っていません（RESEND_API_KEY / MAIL_FROM 未設定）────────"
      : "──────────── メール（開発モード: RESEND_API_KEY 未設定）────────────",
    ` 宛先: ${mail.to}`,
    ` 件名: ${mail.subject}`,
    url ? " 下のリンクをブラウザで開いてください（最後の 1 行だけ）" : " 本文:",
    "────────────────────────────────────────────────────────────────",
    url ?? mail.text,
  ].join("\n");

  /*
   * リンクを最後に置くため、ここで改行を足さない。
   * **本番では error にする。** 設定漏れは直すべき状態で、
   * info だとログの中で埋もれる。
   */
  if (production) {
    console.error(block);
  } else {
    console.info(block);
  }

  void appendToDevLog(mail, url);
}

async function appendToDevLog(mail: Mail, url: string | undefined) {
  try {
    const { appendFile } = await import("node:fs/promises");
    await appendFile(
      ".dev-mail.log",
      [
        `[${new Date().toISOString()}] ${mail.subject} -> ${mail.to}`,
        url ?? mail.text,
        "",
        "",
      ].join("\n"),
      "utf8",
    );
  } catch {
    // 書けなくても送信の扱いは変えない（開発時の補助なので）
  }
}
