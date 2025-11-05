// src/app/(protected)/users/columns.tsx
"use client";

import Link from "next/link";
import * as React from "react";
import type { ColumnDef, HeaderContext } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SquarePen, SlidersVertical } from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { DateRangePicker } from "@/components/filters/date-range-picker";
import { RolesChecklist } from "@/components/filters/roles-checklist";
import { StatusFilter } from "@/components/filters/status-filter";
import { SortButton } from "@/components/datagrid/sort-button"; // ★ 追加

export type UserRow = {
  displayId: string;
  name: string;
  email: string;
  roleCode: string;
  roleName: string;
  roleBadgeColor: string | null;
  isActive: boolean;
  phone: string | null;
  remarks: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function fmt(dt: Date) {
  return format(dt, "yyyy/MM/dd HH:mm", { locale: ja });
}

function HeaderWithFilter({
  title,
  active,
  children,
  contentClassName,
  trailing,
}: {
  title: string;
  active: boolean;
  children: React.ReactNode;
  /** ポップオーバの幅調整用（例：日付レンジで広めに） */
  contentClassName?: string;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-1">
      <span className="whitespace-nowrap">{title}</span>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            size="icon"
            variant={active ? "default" : "outline"}
            className="h-7 w-7 cursor-pointer"
            aria-label={`${title}のフィルタ`}
            title={`${title}のフィルタ`}
          >
            <SlidersVertical className="h-3.5 w-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className={["p-0", contentClassName ?? "w-80"].join(" ")}
        >
          {children}
        </PopoverContent>
      </Popover>
      {/* フィルタボタンの右隣に trailing を表示 */}
      {trailing ? <div className="ml-0.5">{trailing}</div> : null}
    </div>
  );
}

// ★ 追加：フィルタ無しのヘッダ用（タイトル + SortButton）
function HeaderWithSort<TData, TValue>({
  title,
  ctx,
}: {
  title: string;
  ctx: HeaderContext<TData, TValue>;
}) {
  return (
    <div className="flex items-center gap-1">
      <span className="whitespace-nowrap">{title}</span>
      <SortButton
        column={ctx.column}
        aria-label={`${title}でソート`}
        title={`${title}でソート`}
      />
    </div>
  );
}

export const columns: ColumnDef<UserRow>[] = [
  {
    id: "actions",
    header: "操作",
    enableResizing: false,
    size: 40,
    enableSorting: false,
    cell: ({ row }) => (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            asChild
            size="icon"
            variant="outline"
            data-testid={`edit-${row.original.displayId}`}
            className="size-8 cursor-pointer"
          >
            <Link href={`/users/${row.original.displayId}`}>
              <SquarePen />
            </Link>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>参照・編集</p>
        </TooltipContent>
      </Tooltip>
    ),
  },

  {
    accessorKey: "displayId",
    header: (ctx) => <HeaderWithSort title="表示ID" ctx={ctx} />,
    cell: ({ row }) => (
      <span className="font-mono">{row.original.displayId}</span>
    ),
  },
  {
    accessorKey: "name",
    header: (ctx) => <HeaderWithSort title="氏名" ctx={ctx} />,
  },
  {
    accessorKey: "email",
    header: (ctx) => <HeaderWithSort title="メール" ctx={ctx} />,
  },
  {
    accessorKey: "phone",
    header: (ctx) => <HeaderWithSort title="電話" ctx={ctx} />,
  },

  // ロール（フィルタ＋ソート）
  {
    accessorKey: "roleCode",
    header: (ctx) => {
      const table = ctx.table;
      const roleOptions = table.options.meta?.roleOptions ?? [];
      const roles =
        table.options.meta?.roles ?? roleOptions.map((o) => o.value);
      const setRoles = table.options.meta?.setRoles ?? (() => {});
      const active = roles.length !== roleOptions.length;

      return (
        <HeaderWithFilter
          title="ロール"
          active={active}
          contentClassName="w-[340px]"
          trailing={
            <SortButton
              column={ctx.column}
              aria-label="ロールでソート"
              title="ロールでソート"
            />
          }
        >
          <RolesChecklist
            value={roles}
            onChange={setRoles}
            options={roleOptions}
            footer={
              <PopoverPrimitive.Close asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  className="cursor-pointer"
                >
                  閉じる
                </Button>
              </PopoverPrimitive.Close>
            }
          />
        </HeaderWithFilter>
      );
    },
    enableResizing: false,
    size: 56,
    cell: ({ row }) => {
      const { roleCode, roleName, roleBadgeColor } = row.original;
      const style = roleBadgeColor
        ? { backgroundColor: roleBadgeColor, color: "#fff", border: "none" }
        : undefined;
      return (
        <Badge
          variant={roleBadgeColor ? "secondary" : "default"}
          style={style}
          title={roleCode}
        >
          {roleName}
        </Badge>
      );
    },
  },

  // 状態（フィルタ＋ソート）
  {
    accessorKey: "isActive",
    header: (ctx) => {
      const table = ctx.table;
      const status = table.options.meta?.status ?? "ALL";
      const setStatus: (next: "ALL" | "ACTIVE" | "INACTIVE") => void =
        table.options.meta?.setStatus ?? (() => {});
      const active = status !== "ALL";
      return (
        <HeaderWithFilter
          title="状態"
          active={active}
          contentClassName="w-[220px]"
          trailing={
            <SortButton
              column={ctx.column}
              aria-label="状態でソート"
              title="状態でソート"
            />
          }
        >
          <StatusFilter
            value={status}
            onChange={setStatus}
            footer={
              <PopoverPrimitive.Close asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  className="cursor-pointer"
                >
                  閉じる
                </Button>
              </PopoverPrimitive.Close>
            }
          />
        </HeaderWithFilter>
      );
    },
    enableResizing: false,
    size: 50,
    cell: ({ row }) =>
      row.original.isActive ? (
        <Badge data-testid="badge-active">有効</Badge>
      ) : (
        <Badge variant="outline" data-testid="badge-inactive">
          無効
        </Badge>
      ),
  },

  {
    accessorKey: "remarks",
    header: (ctx) => <HeaderWithSort title="備考" ctx={ctx} />,
    size: 150,
    cell: ({ row }) => (
      <div className="max-w-[150px] truncate">{row.original.remarks}</div>
    ),
  },

  // 登録日時（フィルタ＋ソート）
  {
    accessorKey: "createdAt",
    header: (ctx) => {
      const table = ctx.table;
      const r = table.options.meta?.createdRange;
      const setR: (
        r: import("react-day-picker").DateRange | undefined,
      ) => void = table.options.meta?.setCreatedRange ?? (() => {});
      const active = !!(r?.from || r?.to);
      return (
        <HeaderWithFilter
          title="登録日時"
          active={active}
          contentClassName="w-[268px] md:w-[520px] max-w-[90vw]"
          trailing={
            <SortButton
              column={ctx.column}
              aria-label="登録日時でソート"
              title="登録日時でソート"
            />
          }
        >
          <DateRangePicker label="登録日時" value={r} onChange={setR} />
        </HeaderWithFilter>
      );
    },
    size: 120,
    cell: ({ row }) => fmt(row.original.createdAt),
  },

  // 更新日時（フィルタ＋ソート）
  {
    accessorKey: "updatedAt",
    header: (ctx) => {
      const table = ctx.table;
      const r = table.options.meta?.updatedRange;
      const setR: (
        r: import("react-day-picker").DateRange | undefined,
      ) => void = table.options.meta?.setUpdatedRange ?? (() => {});
      const active = !!(r?.from || r?.to);
      return (
        <HeaderWithFilter
          title="更新日時"
          active={active}
          contentClassName="w-[268px] md:w-[520px] max-w-[90vw]"
          trailing={
            <SortButton
              column={ctx.column}
              aria-label="更新日時でソート"
              title="更新日時でソート"
            />
          }
        >
          <DateRangePicker label="更新日時" value={r} onChange={setR} />
        </HeaderWithFilter>
      );
    },
    size: 120,
    cell: ({ row }) => fmt(row.original.updatedAt),
  },

  // hidden 検索列（ソート不可のまま）
  {
    id: "q",
    accessorFn: (r) =>
      `${r.displayId} ${r.name} ${r.email} ${r.phone} ${r.remarks}`.toLowerCase(),
    enableHiding: true,
    enableSorting: false,
    enableResizing: false,
    size: 0,
    header: () => null,
    cell: () => null,
  },
];
