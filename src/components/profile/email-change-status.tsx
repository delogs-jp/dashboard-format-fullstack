// src/components/profile/email-change-status.tsx
"use client";

import * as React from "react";
import * as punycode from "punycode/";
import { useAuth } from "@/lib/auth/context";
import type { MyEmailChangeSummary } from "@/app/_actions/profile/email-status";

export function EmailChangeStatusBanner({
  summary,
}: {
  summary: MyEmailChangeSummary;
}) {
  const { user } = useAuth();
  if (!summary.exists) return null;

  const { status, expiresAt, newEmail } = summary;
  const prettyNew = punycode.toUnicode(newEmail);

  // ログイン中スナップショット（Context）は punycode ASCII 前提
  const snapshotEmail = user?.email ?? null;
  const isApproved = status === "APPROVED";
  const approvedButSnapshotOld =
    isApproved && snapshotEmail && snapshotEmail !== newEmail;

  // 表示用テキスト
  const until = expiresAt
    ? new Date(expiresAt).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })
    : null;

  let heading = "";
  let body = "";
  let tone: "info" | "warn" | "success" = "info";

  switch (status) {
    case "PENDING":
      heading = "認証メールを送信しました";
      body = `【${prettyNew}】への変更を進めるには、受信メールの確認URLをクリックしてください。${until ? `有効期限：${until}` : ""}`;
      tone = "warn";
      break;

    case "VERIFIED":
      heading = "本人確認が完了しました";
      body = `【${prettyNew}】への変更は、現在 管理者の承認待ちです。承認後に反映されます。`;
      tone = "info";
      break;

    case "APPROVED":
      if (approvedButSnapshotOld) {
        heading = "承認が完了しました（再ログインで反映）";
        body =
          `【${prettyNew}】への変更が承認されました。現在の画面は旧メールのままの可能性があります。` +
          `一度ログアウト／再ログインすると反映されます。`;
        tone = "success";
      }
      break;

    default:
      return null;
  }

  if (!body) return null;

  const toneClass =
    tone === "success"
      ? "border-emerald-300 bg-emerald-50 text-emerald-900"
      : tone === "warn"
        ? "border-amber-300 bg-amber-50 text-amber-900"
        : "border-sky-300 bg-sky-50 text-sky-900";

  return (
    <div className={`mb-4 rounded-md border px-3 py-2 text-sm ${toneClass}`}>
      <div className="font-medium">{heading}</div>
      <div className="mt-1">{body}</div>
    </div>
  );
}
