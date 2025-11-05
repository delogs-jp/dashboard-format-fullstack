// src/app/(public)/password-forgot/client.tsx
"use client";

import { useState } from "react";
import { toast } from "sonner";
import PasswordForgotForm, {
  type ForgotRequestValues,
} from "@/components/login/password-forgot-form";
import { passwordForgotAction } from "@/app/_actions/auth/password-forgot";

export default function PasswordForgotClient() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (values: ForgotRequestValues) => {
    if (submitted) return; // 二重送信ガード（念のため）
    setLoading(true);
    try {
      const res = await passwordForgotAction(values);
      if (res.ok) {
        setSubmitted(true);
        toast.success("依頼を受け付けました。登録メールをご確認ください。");
      } else {
        // 入力不正 or 障害時：存在を明かさない曖昧メッセージ
        toast.error("送信内容を確認してください。");
      }
    } catch {
      // 通信例外：曖昧メッセージ（存在秘匿維持）
      toast.error("エラーが発生しました。時間をおいて再度お試しください。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PasswordForgotForm
      onSubmit={handleSubmit}
      loading={loading}
      submitted={submitted}
      onCancel={() => history.back()}
    />
  );
}
