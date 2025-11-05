// src/components/department-roles/department-role-form.tsx
"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  departmentRoleCreateSchema,
  type DepartmentRoleCreateInput,
  type DepartmentRoleCreateValues,
  departmentRoleUpdateSchema,
  type DepartmentRoleUpdateInput,
  type DepartmentRoleUpdateValues,
  DR_PRIORITY_MAX,
} from "@/lib/department-roles/schema";

import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";

type BaseProps = {
  onCancel?: () => void;
  onDelete?: () => void;
  readOnly?: boolean;
};

type CreateProps = BaseProps & {
  mode: "create";
  onSubmit: (values: DepartmentRoleCreateValues) => void;
  initialValues?: never;
};

type EditProps = BaseProps & {
  mode: "edit";
  onSubmit: (values: DepartmentRoleUpdateValues) => void;
  initialValues: DepartmentRoleUpdateValues;
};

type Props = CreateProps | EditProps;

export default function DepartmentRoleForm(props: Props) {
  return props.mode === "create" ? (
    <CreateForm {...props} />
  ) : (
    <EditForm {...props} />
  );
}

function CreateForm({ onSubmit, onCancel }: CreateProps) {
  const form = useForm<
    DepartmentRoleCreateInput,
    undefined,
    DepartmentRoleCreateValues
  >({
    resolver: zodResolver(departmentRoleCreateSchema),
    defaultValues: {
      code: "",
      name: "",
      priority: 0,
      badgeColor: "#666666",
      isEnabled: true,
      canDownloadData: false,
      canEditData: false,
      remarks: "",
    },
    mode: "onBlur",
  });

  const handleSubmit = form.handleSubmit(onSubmit);

  return (
    <Form {...form}>
      <form data-testid="department-role-form-create" onSubmit={handleSubmit}>
        <Card className="w-full rounded-md">
          <CardContent className="space-y-6 pt-1">
            <CodeField />
            <NameField />
            <PriorityField />
            <BadgeColorField />
            <IsEnabledField />
            <CanDownloadField />
            <CanEditField />
            <RemarksField />
          </CardContent>
          <CardFooter className="mt-4 flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              data-testid="cancel-btn"
              className="cursor-pointer"
            >
              キャンセル
            </Button>
            <Button
              type="submit"
              data-testid="submit-create"
              disabled={form.formState.isSubmitting}
              className="cursor-pointer"
            >
              登録する
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}

function EditForm({
  initialValues,
  onSubmit,
  onCancel,
  onDelete,
  readOnly = false,
}: EditProps) {
  const form = useForm<
    DepartmentRoleUpdateInput,
    undefined,
    DepartmentRoleUpdateValues
  >({
    resolver: zodResolver(departmentRoleUpdateSchema),
    defaultValues: initialValues,
    mode: "onBlur",
  });

  const handleSubmit = form.handleSubmit(onSubmit);
  const isCustom = initialValues.kind === "custom";

  return (
    <Form {...form}>
      <form data-testid="department-role-form-edit" onSubmit={handleSubmit}>
        <Card className="w-full rounded-md">
          <CardContent className="space-y-6 pt-1">
            {isCustom ? (
              <>
                <DisplayIdField />
                <CodeField readOnly={readOnly} />
                <NameField readOnly={readOnly} />
                <PriorityField readOnly={readOnly} />
                <BadgeColorField readOnly={readOnly} />
                <IsEnabledField readOnly={readOnly} />
                <CanDownloadField readOnly={readOnly} />
                <CanEditField readOnly={readOnly} />
                <RemarksField readOnly={readOnly} />
              </>
            ) : (
              <>
                {/* override: 実効値をそのまま初期表示（テキスト＋カラー） */}
                <OverrideNameField readOnly={readOnly} />
                <OverrideBadgeColorField readOnly={readOnly} />
                <IsEnabledField readOnly={readOnly} />
              </>
            )}
          </CardContent>

          <CardFooter className="mt-4 flex items-center justify-between">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                data-testid="cancel-btn"
                className="cursor-pointer"
              >
                キャンセル
              </Button>
              {!readOnly && (
                <Button
                  type="submit"
                  data-testid="submit-update"
                  disabled={form.formState.isSubmitting}
                  className="cursor-pointer"
                >
                  更新する
                </Button>
              )}
            </div>
            {!readOnly && onDelete && (
              <Button
                type="button"
                variant="destructive"
                onClick={onDelete}
                data-testid="delete"
                className="cursor-pointer"
              >
                削除する
              </Button>
            )}
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}

/* ===== 共通フィールド ===== */

function DisplayIdField() {
  return (
    <FormField
      name="displayId"
      render={({ field }) => (
        <FormItem>
          <FormLabel>表示ID</FormLabel>
          <FormControl>
            <Input
              {...field}
              readOnly
              aria-readonly="true"
              data-testid="displayId"
              className="text-muted-foreground bg-muted border-none focus-visible:ring-0"
            />
          </FormControl>
          <FormDescription>DBで自動採番される表示IDです。</FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function CodeField({ readOnly = false }: { readOnly?: boolean }) {
  return (
    <FormField
      name="code"
      render={({ field }) => (
        <FormItem>
          <FormLabel className="font-semibold">コード *</FormLabel>
          <FormControl>
            <Input
              {...field}
              placeholder="ANALYST"
              aria-label="コード"
              autoComplete="off"
              data-testid="code"
              readOnly={readOnly}
              aria-readonly={readOnly}
              className={readOnly ? "bg-muted pointer-events-none" : ""}
            />
          </FormControl>
          <FormMessage data-testid="code-error" />
        </FormItem>
      )}
    />
  );
}

function NameField({ readOnly = false }: { readOnly?: boolean }) {
  return (
    <FormField
      name="name"
      render={({ field }) => (
        <FormItem>
          <FormLabel className="font-semibold">表示名 *</FormLabel>
          <FormControl>
            <Input
              {...field}
              placeholder="分析担当"
              aria-label="表示名"
              autoComplete="off"
              data-testid="name"
              readOnly={readOnly}
              aria-readonly={readOnly}
              className={readOnly ? "bg-muted pointer-events-none" : ""}
            />
          </FormControl>
          <FormMessage data-testid="name-error" />
        </FormItem>
      )}
    />
  );
}

function PriorityField({ readOnly = false }: { readOnly?: boolean }) {
  return (
    <FormField
      name="priority"
      render={({ field }) => (
        <FormItem>
          <FormLabel className="font-semibold">優先度 *</FormLabel>
          <FormControl>
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              max={DR_PRIORITY_MAX}
              step={1}
              {...field}
              value={field.value == null ? "" : String(field.value)}
              onChange={(e) =>
                field.onChange(e.target.value === "" ? "" : e.target.value)
              }
              placeholder="20"
              aria-label="優先度"
              data-testid="priority"
              readOnly={readOnly}
              aria-readonly={readOnly}
              className={readOnly ? "bg-muted pointer-events-none" : ""}
            />
          </FormControl>
          <FormDescription className="text-xs">
            0〜{DR_PRIORITY_MAX} の整数で入力してください。
          </FormDescription>
          <FormMessage data-testid="priority-error" />
        </FormItem>
      )}
    />
  );
}

function BadgeColorField({ readOnly = false }: { readOnly?: boolean }) {
  return (
    <FormField
      name="badgeColor"
      render={({ field }) => (
        <FormItem>
          <FormLabel className="font-semibold">バッジ色</FormLabel>
          <FormControl>
            <Input
              type="color"
              {...field}
              aria-label="バッジ色"
              data-testid="badgeColor"
              disabled={readOnly}
              className={readOnly ? "opacity-70" : "cursor-pointer"}
            />
          </FormControl>
          <FormMessage data-testid="badgeColor-error" />
        </FormItem>
      )}
    />
  );
}

function IsEnabledField({ readOnly = false }: { readOnly?: boolean }) {
  return (
    <FormField
      name="isEnabled"
      render={({ field }) => (
        <FormItem className="mt-1 flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
          <div className="space-y-0.5">
            <FormLabel className="font-semibold">有効 *</FormLabel>
            <FormDescription>ONで有効/OFFで無効</FormDescription>
          </div>
          <FormControl>
            <Switch
              name={field.name}
              checked={Boolean(field.value)}
              onCheckedChange={field.onChange}
              aria-label="有効"
              data-testid="isEnabled"
              disabled={readOnly}
            />
          </FormControl>
          <FormMessage data-testid="isEnabled-error" />
        </FormItem>
      )}
    />
  );
}

function CanDownloadField({ readOnly = false }: { readOnly?: boolean }) {
  return (
    <FormField
      name="canDownloadData"
      render={({ field }) => (
        <FormItem className="mt-1 flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
          <FormLabel className="font-semibold">データDL可 *</FormLabel>
          <FormControl>
            <Switch
              name={field.name}
              checked={Boolean(field.value)}
              onCheckedChange={field.onChange}
              aria-label="データDL可"
              data-testid="canDownloadData"
              disabled={readOnly}
            />
          </FormControl>
          <FormMessage data-testid="canDownloadData-error" />
        </FormItem>
      )}
    />
  );
}

function CanEditField({ readOnly = false }: { readOnly?: boolean }) {
  return (
    <FormField
      name="canEditData"
      render={({ field }) => (
        <FormItem className="mt-1 flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
          <FormLabel className="font-semibold">データ編集可 *</FormLabel>
          <FormControl>
            <Switch
              name={field.name}
              checked={Boolean(field.value)}
              onCheckedChange={field.onChange}
              aria-label="データ編集可"
              data-testid="canEditData"
              disabled={readOnly}
            />
          </FormControl>
          <FormMessage data-testid="canEditData-error" />
        </FormItem>
      )}
    />
  );
}

function RemarksField({ readOnly = false }: { readOnly?: boolean }) {
  return (
    <FormField
      name="remarks"
      render={({ field }) => (
        <FormItem>
          <FormLabel className="font-semibold">備考</FormLabel>
          <FormControl>
            <Input
              {...field}
              placeholder="メモなど"
              aria-label="備考"
              autoComplete="off"
              data-testid="remarks"
              readOnly={readOnly}
              aria-readonly={readOnly}
              className={readOnly ? "bg-muted pointer-events-none" : ""}
            />
          </FormControl>
          <FormMessage data-testid="remarks-error" />
        </FormItem>
      )}
    />
  );
}

/* ===== override 用（そのまま初期表示） ===== */

function OverrideNameField({ readOnly = false }: { readOnly?: boolean }) {
  return (
    <FormField
      name="nameOverride"
      render={({ field }) => (
        <FormItem>
          <FormLabel className="font-semibold">表示名（上書き）</FormLabel>
          <FormControl>
            <Input
              {...field}
              placeholder="表示名（ベースを上書き）"
              aria-label="表示名（上書き）"
              autoComplete="off"
              data-testid="nameOverride"
              readOnly={readOnly}
              aria-readonly={readOnly}
              className={readOnly ? "bg-muted pointer-events-none" : ""}
            />
          </FormControl>
          <FormMessage data-testid="nameOverride-error" />
        </FormItem>
      )}
    />
  );
}

function OverrideBadgeColorField({ readOnly = false }: { readOnly?: boolean }) {
  return (
    <FormField
      name="badgeColorOverride"
      render={({ field }) => (
        <FormItem>
          <FormLabel className="font-semibold">バッジ色（上書き）</FormLabel>
          <FormControl>
            <Input
              type="color"
              {...field}
              aria-label="バッジ色（上書き）"
              data-testid="badgeColorOverride"
              disabled={readOnly}
              className={readOnly ? "opacity-70" : "cursor-pointer"}
            />
          </FormControl>
          <FormMessage data-testid="badgeColorOverride-error" />
        </FormItem>
      )}
    />
  );
}
