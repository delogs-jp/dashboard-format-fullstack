// src/app/(protected)/profile/email/client.tsx（差分：ステータス表示を追加）
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth/context";
import EmailChangeForm from "@/components/profile/email-change-form";
import { EmailChangeStatusBanner } from "@/components/profile/email-change-status";
import type { EmailChangeValues } from "@/lib/users/schema";
import { sendEmailChangeRequestAction } from "@/app/_actions/profile/email-change";
import {
  getMyEmailChangeStatus,
  type MyEmailChangeSummary,
} from "@/app/_actions/profile/email-status";

export default function EmailChangeClient() {
  const router = useRouter();
  const { user, ready } = useAuth();
  const [summary, setSummary] = useState<MyEmailChangeSummary>({
    exists: false,
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      const s = await getMyEmailChangeStatus();
      if (mounted) setSummary(s);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (!ready || !user) return null;
  const currentEmail = user.email;

  const onSubmit = async (values: EmailChangeValues) => {
    const fd = new FormData();
    fd.set("newEmail", values.newEmail);

    const res = await sendEmailChangeRequestAction(fd);
    if (!res.ok) {
      toast.error(res.message ?? "認証メールの送信に失敗しました");
      return;
    }
    toast.success("認証メールを送信しました", {
      description: `送信先：${values.newEmail}`,
      duration: 3500,
    });
    router.push("/profile");
  };

  return (
    <>
      <EmailChangeStatusBanner summary={summary} />
      <EmailChangeForm
        currentEmail={currentEmail}
        onSubmit={onSubmit}
        onCancel={() => history.back()}
      />
    </>
  );
}
