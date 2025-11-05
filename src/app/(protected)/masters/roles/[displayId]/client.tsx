// src/app/(protected)/masters/roles/[displayId]/client.tsx
"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import DepartmentRoleForm from "@/components/department-roles/department-role-form";
import type { DepartmentRoleUpdateValues } from "@/lib/department-roles/schema";
import {
  updateDepartmentRole,
  deleteDepartmentRole,
} from "@/app/_actions/department-roles/update";

type Props = {
  initialValues: DepartmentRoleUpdateValues;
  canEditData?: boolean;
};

export default function EditDepartmentRoleClient({
  initialValues,
  canEditData = false,
}: Props) {
  const router = useRouter();

  const handleSubmit = async (values: DepartmentRoleUpdateValues) => {
    if (!canEditData) return; // 念のための保険（編集権がないと通常はボタン非表示）
    // override の空入力は「ベース値を使う」＝ undefined に正規化
    const normalized: DepartmentRoleUpdateValues =
      values.kind === "override"
        ? {
            ...values,
            nameOverride:
              values.nameOverride && values.nameOverride.trim() !== ""
                ? values.nameOverride
                : undefined,
            badgeColorOverride:
              values.badgeColorOverride &&
              values.badgeColorOverride.trim() !== ""
                ? values.badgeColorOverride
                : undefined,
          }
        : values;

    const res = await updateDepartmentRole(normalized);

    if (res.ok) {
      toast.success("ロールを更新しました", { duration: 3000 });
      router.push("/masters/roles");
      router.refresh();
      return;
    }
    toast.error(res.message ?? "更新に失敗しました。", { duration: 3500 });
  };

  const handleDelete =
    canEditData && (initialValues.kind === "custom" || initialValues.displayId)
      ? async () => {
          const id =
            initialValues.kind === "custom"
              ? initialValues.displayId
              : (initialValues.displayId as string);
          const res = await deleteDepartmentRole(id);
          if (res.ok) {
            toast.success(
              initialValues.kind === "custom"
                ? "ロールを削除しました"
                : "上書きを削除しました（ベースに戻ります）",
            );
            router.push("/masters/roles");
            router.refresh();
          } else {
            toast.error(res.message ?? "削除に失敗しました。");
          }
        }
      : undefined;

  return (
    <DepartmentRoleForm
      mode="edit"
      initialValues={initialValues}
      onSubmit={canEditData ? handleSubmit : () => {}}
      onCancel={() => history.back()}
      onDelete={canEditData ? handleDelete : undefined}
      readOnly={!canEditData}
    />
  );
}
