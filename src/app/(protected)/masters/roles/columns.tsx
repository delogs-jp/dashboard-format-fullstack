// src/app/(protected)/masters/roles/columns.tsx
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
import { StatusFilter } from "@/components/filters/status-filter";
import { SortButton } from "@/components/datagrid/sort-button";
import { TypesChecklist } from "./types-checklist";
// ★ 追加：日付レンジフィルタ
import { DateRangePicker } from "@/components/filters/date-range-picker";

export type DepartmentRoleRow = {
  displayId: string; // RL... or DR...
  code: string; // 表示用コード
  kind: "role" | "override" | "custom";
  nameEffective: string;
  badgeColorEffective: string | null;
  priority: number;
  canEditData: boolean;
  canDownloadData: boolean;
  isEnabledInDepartment: boolean; // 部署視点の有効
  remarks: string | null; // customのみ
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
      {trailing ? <div className="ml-0.5">{trailing}</div> : null}
    </div>
  );
}

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

export const columns: ColumnDef<DepartmentRoleRow>[] = [
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
            <Link href={`/masters/roles/${row.original.displayId}`}>
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
    accessorKey: "code",
    header: (ctx) => <HeaderWithSort title="コード" ctx={ctx} />,
  },

  // 種別フィルタ（role/override/custom）
  {
    accessorKey: "kind",
    header: (ctx) => {
      const table = ctx.table;
      const kindOptions = table.options.meta?.kindOptions ?? [];
      const kinds =
        table.options.meta?.kinds ??
        kindOptions.map((o: { value: string }) => o.value);
      const setKinds = table.options.meta?.setKinds ?? (() => {});
      const active = kinds.length !== kindOptions.length;

      return (
        <HeaderWithFilter
          title="種別"
          active={active}
          contentClassName="w-[300px]"
          trailing={
            <SortButton
              column={ctx.column}
              aria-label="種別でソート"
              title="種別でソート"
            />
          }
        >
          <TypesChecklist
            value={kinds}
            onChange={setKinds}
            options={kindOptions}
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
    size: 64,
    enableResizing: false,
    cell: ({ row }) => {
      const k = row.original.kind;
      const label =
        k === "role" ? "ベース" : k === "override" ? "上書き" : "部署ローカル";
      return (
        <Badge variant={k === "custom" ? "secondary" : "outline"}>
          {label}
        </Badge>
      );
    },
  },

  // 表示名（実効）＋色バッジ
  {
    accessorKey: "nameEffective",
    header: (ctx) => <HeaderWithSort title="表示名" ctx={ctx} />,
    cell: ({ row }) => {
      const color = row.original.badgeColorEffective;
      const style = color
        ? { backgroundColor: color, color: "#fff", border: "none" }
        : undefined;
      return (
        <div className="flex items-center gap-2">
          <Badge
            variant={color ? "secondary" : "outline"}
            style={style}
            title={color ?? ""}
          >
            {row.original.nameEffective}
          </Badge>
        </div>
      );
    },
  },

  {
    accessorKey: "priority",
    header: (ctx) => <HeaderWithSort title="優先度" ctx={ctx} />,
    size: 60,
  },

  {
    accessorKey: "canEditData",
    header: (ctx) => <HeaderWithSort title="編集可" ctx={ctx} />,
    size: 56,
    cell: ({ row }) => (row.original.canEditData ? "✅" : "—"),
  },
  {
    accessorKey: "canDownloadData",
    header: (ctx) => <HeaderWithSort title="DL可" ctx={ctx} />,
    size: 56,
    cell: ({ row }) => (row.original.canDownloadData ? "✅" : "—"),
  },

  // 状態（部署での有効）フィルタ
  {
    accessorKey: "isEnabledInDepartment",
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
          <StatusFilter value={status} onChange={setStatus} />
        </HeaderWithFilter>
      );
    },
    size: 50,
    enableResizing: false,
    cell: ({ row }) =>
      row.original.isEnabledInDepartment ? (
        <Badge data-testid="badge-enabled">有効</Badge>
      ) : (
        <Badge variant="outline" data-testid="badge-disabled">
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

  // ★ 登録日時（フィルタ＋ソート）
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

  // ★ 更新日時（フィルタ＋ソート）
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

  // 検索用の隠し列
  {
    id: "q",
    accessorFn: (r) =>
      `${r.displayId} ${r.code} ${r.nameEffective} ${r.remarks ?? ""}`.toLowerCase(),
    enableHiding: true,
    enableSorting: false,
    size: 0,
    header: () => null,
    cell: () => null,
  },
];
