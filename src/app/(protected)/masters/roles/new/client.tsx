// src/app/(protected)/masters/roles/new/client.tsx
"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import DepartmentRoleForm from "@/components/department-roles/department-role-form";
import type { DepartmentRoleCreateValues } from "@/lib/department-roles/schema";
import { createDepartmentRole } from "@/app/_actions/department-roles/create";

export default function NewDepartmentRoleClient() {
  const router = useRouter();

  const handleSubmit = async (values: DepartmentRoleCreateValues) => {
    const res = await createDepartmentRole(values);

    if (res.ok) {
      toast.success("ロールを作成しました", {
        description: [
          `コード: ${values.code}`,
          `表示名: ${values.name}`,
          `優先度: ${values.priority}`,
          `DL: ${values.canDownloadData ? "可" : "不可"}`,
          `編集: ${values.canEditData ? "可" : "不可"}`,
        ].join(" / "),
        duration: 3000,
      });
      router.push("/masters/roles");
      router.refresh();
      return;
    }

    // 失敗時：詳細はクライアント検証に委譲し、汎用メッセージを表示
    toast.error(
      res.message ?? "登録に失敗しました。入力内容を確認してください。",
      {
        duration: 3500,
      },
    );
  };

  return (
    <DepartmentRoleForm
      mode="create"
      onSubmit={handleSubmit}
      onCancel={() => history.back()}
    />
  );
}
