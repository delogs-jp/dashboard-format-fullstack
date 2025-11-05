// src/app/(protected)/profile/password/client.tsx（新規）
"use client";

import { useRouter } from "next/navigation";
import PasswordChangeForm from "@/components/profile/password-change-form";
import { toast } from "sonner";
import { changeMyPasswordAction } from "@/app/_actions/profile/password-change";

export default function PasswordChangeClient() {
  const router = useRouter();

  return (
    <div className="max-w-xl p-4 pt-0">
      <PasswordChangeForm
        onSubmit={async (values) => {
          const fd = new FormData();
          fd.set("currentPassword", values.currentPassword);
          fd.set("newPassword", values.newPassword);

          const res = await changeMyPasswordAction(fd);
          if (!res.ok) {
            if (res.fieldErrors?.currentPassword) {
              toast.error(res.fieldErrors.currentPassword);
              return;
            }
            if (res.fieldErrors?.newPassword) {
              toast.error(res.fieldErrors.newPassword);
              return;
            }
            toast.error(res.message ?? "パスワード変更に失敗しました");
            return;
          }

          toast.success("パスワードを変更しました", {
            description: "次回ログインから新しいパスワードをご利用ください。",
            duration: 3500,
          });
          router.push("/profile");
        }}
        onCancel={() => history.back()}
      />
    </div>
  );
}
