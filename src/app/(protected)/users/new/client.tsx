// src/app/(protected)/users/new/client.tsx
"use client";

import { useRouter } from "next/navigation";
import UserForm from "@/components/users/user-form";
import type { UserCreateValues } from "@/lib/users/schema";
import { createUser } from "@/app/_actions/users/create-user";
import { toast } from "sonner";
// 2章の型（value/label/priority/disabled）
import type { AssignableRoleOption } from "@/app/_actions/department-roles/get-assignable-roles";

type Props = {
  roleOptions: AssignableRoleOption[];
};

export default function NewUserClient({ roleOptions }: Props) {
  const router = useRouter();
  // フォームからは通常項目（Zod）＋ selectedRole（string）を受け取りたい
  const handleSubmit = async (
    values: UserCreateValues,
    selectedRole: string | null,
    selectedRoleLabel: string | null,
  ) => {
    const res = await createUser(values, selectedRole ?? "");
    if (res.ok) {
      toast.success("ユーザを作成しました", {
        description: `${values.email}（ロール: ${selectedRoleLabel ?? "N/A"}）`,
        duration: 3000,
      });
      router.push("/users");
      router.refresh();
      return;
    }
    toast.error(
      res.message ?? "登録に失敗しました。入力内容を確認してください。",
      {
        duration: 3500,
      },
    );
  };

  return (
    <UserForm
      mode="create"
      roleOptions={roleOptions}
      onSubmitWithRole={handleSubmit} // ← 追加の props（下の Form で説明）
      onCancel={() => history.back()}
    />
  );
}
