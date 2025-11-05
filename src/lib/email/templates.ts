// src/lib/email/templates.ts
const { APP_ORIGIN } = process.env;

export function buildVerifyUrl(token: string) {
  const origin = APP_ORIGIN ?? "http://localhost:3000";
  const url = new URL("/profile/email/verify", origin);
  url.searchParams.set("token", token);
  return url.toString();
}

export function buildLoginUrl() {
  const origin = APP_ORIGIN ?? "http://localhost:3000";
  return new URL("/", origin).toString();
}

/** メールアドレス変更：認証メール（新メール宛） */
export function emailChangeVerify(params: {
  newEmail: string;
  token: string;
  expiresAt: Date;
}) {
  const url = buildVerifyUrl(params.token);
  const until = params.expiresAt.toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
  });
  const subject = "【DELOGs】メールアドレス変更の確認";
  const text = [
    "DELOGsシステムよりの自動返信です。このメールに返信いただいても応答できませんのでご了承ください。",
    "",
    "メールアドレス変更の確認のため、以下のURLをクリックしてください。ログイン画面が表示される場合は、変更前のメールアドレスでログインしてください。",
    "",
    url,
    "",
    `上記URLの有効期限：${until} まで`,
    "",
    `変更予定のメールアドレス：${params.newEmail}`,
    "",
    "上記URLへアクセス後に管理者の承認が完了すると、メールアドレスの変更が完了します。",
    "",
    "",
    "※氏名や変更前アドレスはセキュリティを考慮して記載していません。",
    "※このメールに心当たりがない場合は破棄してください。",
  ].join("\n");
  return { subject, text };
}

/** メールアドレス変更：承認完了（新メール宛） */
export function emailChangeApproved(params: {
  newEmail: string; // punycode (ASCII)可
}) {
  const subject = "【DELOGs】メールアドレス変更が承認されました";
  const text = [
    "DELOGsシステムより自動送信しています。このメールへの返信は受け付けていません。",
    "",
    "メールアドレス変更の申請が管理者により承認されました。",
    "",
    `■ 変更後メール：${params.newEmail}`,
    "",
    "以後のログイン・通知は上記の新しいメールアドレスが対象となります。",
    "",
    "※このメールに心当たりがない場合は、管理者へお問い合わせください。",
  ].join("\n");
  return { subject, text };
}

/** 新規ユーザ：ようこそメール（本人宛） */
export function userWelcome(params: {
  name: string;
  email: string;
  departmentCode: string;
  initialPassword: string;
}) {
  const loginUrl = buildLoginUrl();
  const subject = "【DELOGs】アカウント発行のお知らせ";
  const text = [
    "DELOGsシステムより自動送信しています。このメールへの返信は受け付けていません。",
    "",
    `${params.name} 様`,
    "",
    "アカウントが作成されました。以下の情報でログインしてください。",
    "",
    `ログインURL：${loginUrl}`,
    `部署コード　：${params.departmentCode}`,
    `メール　　　：${params.email}`,
    `初期パスワード：${params.initialPassword}`,
    "",
    "※ 初回ログイン後にパスワードを変更してください。",
    "※ このメールに心当たりがない場合は、管理者へお問い合わせください。",
  ].join("\n");
  return { subject, text };
}

/** パスワード再発行：本人通知（依頼メール宛） */
export function passwordIssued(params: {
  name?: string;
  email: string; // punycode (ASCII) 可
  newPassword: string; // 平文（再発行ワンショット）
}) {
  const loginUrl = buildLoginUrl();
  const subject = "【DELOGs】パスワードを再発行しました";
  const text = [
    "DELOGsシステムより自動送信しています。このメールへの返信は受け付けていません。",
    "",
    params.name ? `${params.name} 様` : "ご担当者様",
    "",
    "パスワードを再発行しました。以下の情報でログインしてください。",
    "",
    `ログインURL：${loginUrl}`,
    `メール　　　：${params.email}`,
    `新パスワード：${params.newPassword}`,
    "",
    "※ セキュリティのため、ログイン後にパスワードを変更してください。",
    "※ このメールに心当たりがない場合は、管理者へお問い合わせください。",
  ].join("\n");
  return { subject, text };
}

/** 管理者向け：パスワード再発行依頼の着信通知 */
export function adminPasswordForgotNotify(params: {
  accountId: string;
  email: string;
  note?: string;
  ip?: string;
  ua?: string;
}) {
  const subject = "【DELOGs】パスワード再発行依頼が届きました";
  const lines = [
    "公開フォームからパスワード再発行依頼を受け付けました。",
    "",
    `■ 部署コード入力：${params.accountId}`,
    `■ 申請メール　　：${params.email}`,
    params.note ? `■ 備考　　　　　：${params.note}` : null,
    params.ip ? `■ IP　　　　　　：${params.ip}` : null,
    params.ua ? `■ UA　　　　　　：${params.ua}` : null,
    "",
    "管理画面の「ユーザ管理 > パスワード再発行依頼」から処理してください。",
  ].filter(Boolean);
  return { subject, text: lines.join("\n") };
}

/** 管理者向け：メール変更の本人認証(VERIFIED)が完了した通知 */
export function adminEmailChangeVerifiedNotify(params: {
  userName: string;
  userEmail: string;
}) {
  const subject = "【DELOGs】メール変更リクエストが確認されました";
  const text = [
    `ユーザ ${params.userName} (${params.userEmail}) が新しいメールアドレスを認証しました。`,
    "",
    "管理者画面にて承認または却下を行ってください。",
  ].join("\n");
  return { subject, text };
}
