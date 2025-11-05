// src/app/(protected)/users/[displayId]/client.tsx
"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import UserForm from "@/components/users/user-form";
import type { UserUpdateValues } from "@/lib/users/schema";
import {
  updateUserAction,
  deleteUserAction,
} from "@/app/_actions/users/update-user";
import type { AssignableRoleOption } from "@/app/_actions/department-roles/get-assignable-roles";

// page.tsx から来る型（Server Action の返り値）
type UserForEdit = {
  displayId: string;
  name: string;
  email: string;
  isActive: boolean;
  phone?: string | null;
  remarks?: string | null;
  roleCode: string; // "role:<id>" | "dr:<id>"
  currentAssignment?: { value: string; label: string; disabled?: boolean };
};

type Props = {
  initialValues: UserForEdit; // ← ここは UserForEdit を受ける
  roleOptions: AssignableRoleOption[];
};

export default function EditUserClient({ initialValues, roleOptions }: Props) {
  const router = useRouter();

  // UserForm に渡す直前で UserUpdateValues に整形（不要な currentAssignment を落とす）
  const formInit: UserUpdateValues = {
    displayId: initialValues.displayId,
    name: initialValues.name,
    email: initialValues.email,
    roleCode: initialValues.roleCode, // XOR 文字列をそのまま
    isActive: initialValues.isActive,
    // RHF/Zod 的に undefined の方が扱いやすいので null を undefined に寄せる
    phone: initialValues.phone ?? undefined,
    remarks: initialValues.remarks ?? undefined,
  };

  return (
    <UserForm
      mode="edit"
      initialValues={formInit}
      roleOptions={roleOptions}
      onSubmit={async (values) => {
        const res = await updateUserAction(values);
        if (res.ok) {
          const roleLabel =
            roleOptions.find((o) => o.value === values.roleCode)?.label ??
            values.roleCode;

          toast.success("ユーザを更新しました", {
            description: `ID: ${values.displayId} / ${values.email} / ロール: ${roleLabel} / 有効: ${values.isActive ? "ON" : "OFF"}`,
            duration: 3000,
          });
          router.push("/users");
          router.refresh();
          return;
        }
        toast.error(
          res.message ?? "更新に失敗しました。入力内容を確認してください。",
          { duration: 3500 },
        );
      }}
      onCancel={() => history.back()}
      onDelete={async () => {
        const res = await deleteUserAction(initialValues.displayId);
        if (res.ok) {
          toast.success("ユーザを論理削除しました", {
            description: `ID: ${initialValues.displayId}`,
          });
          router.push("/users");
          router.refresh();
        } else {
          toast.error(res.message ?? "削除に失敗しました");
        }
      }}
    />
  );
}
