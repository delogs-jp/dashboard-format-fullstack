// src/lib/mailer.ts
import nodemailer from "nodemailer";

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM } = process.env;

if (!SMTP_HOST || !SMTP_PORT || !MAIL_FROM) {
  // 本番では logger へ
  console.warn("[mailer] SMTP 環境変数が未設定です。メール送信は失敗します。");
}

export type SendMailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export async function sendMail(input: SendMailInput) {
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT ?? 587),
    secure: false, // 587/TLS
    auth:
      SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
  });

  await transporter.sendMail({
    from: MAIL_FROM,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html ?? `<pre>${escapeHtml(input.text)}</pre>`,
  });
}

function escapeHtml(s: string) {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
}
