// src/app/(protected)/users/password-request/columns.tsx
"use client";

import type { ColumnDef, HeaderContext } from "@tanstack/react-table";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SlidersVertical } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import * as PopoverPrimitive from "@radix-ui/react-popover";

import { DateRangePicker } from "@/components/filters/date-range-picker";
import { RolesChecklist } from "@/components/filters/roles-checklist";
import { SortButton } from "@/components/datagrid/sort-button";
import { StatusMultiSelectPw } from "./status-multi-select";

export type PasswordRequestRow = {
  id: string;
  requestedAt: Date;
  processedAt: Date | null;
  processedBy: string | null;
  userId: string; // ユーザ displayId
  userName: string;
  email: string;
  roleCode: string;
  roleName: string;
  roleBadgeColor: string | null;
  status: "PENDING" | "ISSUED" | "REJECTED";
  note: string;
};

function fmt(d?: Date | null) {
  if (!d) return "-";
  return format(d, "yyyy/MM/dd HH:mm", { locale: ja });
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

export const columns: ColumnDef<PasswordRequestRow>[] = [
  // 依頼日時（フィルタ＋ソート）
  {
    accessorKey: "requestedAt",
    header: (ctx) => {
      const table = ctx.table;
      const r = table.options.meta?.requestedRange;
      const setR: (
        r: import("react-day-picker").DateRange | undefined,
      ) => void = table.options.meta?.setRequestedRange ?? (() => {});
      const active = !!(r?.from || r?.to);
      return (
        <HeaderWithFilter
          title="依頼日時"
          active={active}
          contentClassName="w-[268px] md:w-[520px] max-w-[90vw]"
          trailing={
            <SortButton
              column={ctx.column}
              aria-label="依頼日時でソート"
              title="依頼日時でソート"
            />
          }
        >
          <DateRangePicker label="依頼日時" value={r} onChange={setR} />
        </HeaderWithFilter>
      );
    },
    cell: ({ row }) => fmt(row.original.requestedAt),
  },

  // ユーザID（displayId）
  {
    accessorKey: "userId",
    header: (ctx) => <HeaderWithSort title="ユーザID" ctx={ctx} />,
    cell: ({ row }) => <span className="font-mono">{row.original.userId}</span>,
  },

  // ユーザ名
  {
    accessorKey: "userName",
    header: (ctx) => <HeaderWithSort title="ユーザ名" ctx={ctx} />,
  },

  // メール
  {
    accessorKey: "email",
    header: (ctx) => <HeaderWithSort title="メール" ctx={ctx} />,
  },
  // ★ 備考（新規：ソートのみ）
  {
    accessorKey: "note",
    header: (ctx) => <HeaderWithSort title="備考" ctx={ctx} />,
    size: 180,
    cell: ({ row }) => (
      <div className="max-w-[220px] truncate">{row.original.note}</div>
    ),
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
      // roles は「見做し：空=すべて」ではなく DataTable 側で“有効集合”が渡る想定なので、
      // active 判定は roleOptions 長と比較でOK
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
    size: 60,
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

  // 状態（フィルタ + ソート）
  {
    accessorKey: "status",
    header: (ctx) => {
      const table = ctx.table;
      const opts = table.options.meta?.pwStatusOptions ?? [];
      const selectedRaw = table.options.meta?.pwStatuses ?? []; // 空=すべて（URL表現）
      // ← “初期オフ表示”にするため、空配列のときは全選択と同義に解釈して active=false
      const effectiveSelected =
        selectedRaw.length > 0 ? selectedRaw : opts.map((o) => o.value);
      const active = effectiveSelected.length !== opts.length;
      const setSelected = table.options.meta?.setPwStatuses ?? (() => {});

      return (
        <HeaderWithFilter
          title="状態"
          active={active}
          trailing={
            <SortButton
              column={ctx.column}
              aria-label="状態でソート"
              title="状態でソート"
            />
          }
        >
          <StatusMultiSelectPw
            value={selectedRaw}
            onChange={setSelected}
            options={opts}
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
    cell: ({ row }) => {
      const s = row.original.status;
      if (s === "ISSUED") return <Badge>再発行済み</Badge>;
      if (s === "REJECTED") return <Badge variant="destructive">拒否</Badge>;
      return <Badge variant="outline">未処理</Badge>;
    },
  },

  // 処理日時（フィルタ＋ソート）
  {
    accessorKey: "processedAt",
    header: (ctx) => {
      const table = ctx.table;
      const r = table.options.meta?.processedRange;
      const setR: (
        r: import("react-day-picker").DateRange | undefined,
      ) => void = table.options.meta?.setProcessedRange ?? (() => {});
      const active = !!(r?.from || r?.to);
      return (
        <HeaderWithFilter
          title="処理日時"
          active={active}
          contentClassName="w-[268px] md:w-[520px] max-w-[90vw]"
          trailing={
            <SortButton
              column={ctx.column}
              aria-label="処理日時でソート"
              title="処理日時でソート"
            />
          }
        >
          <DateRangePicker label="処理日時" value={r} onChange={setR} />
        </HeaderWithFilter>
      );
    },
    cell: ({ row }) => fmt(row.original.processedAt),
  },

  // 処理者
  {
    accessorKey: "processedBy",
    header: (ctx) => <HeaderWithSort title="処理者" ctx={ctx} />,
  },

  // 操作（UIのみ・ServerAction未接続）
  {
    id: "actions",
    header: "操作",
    enableSorting: false,
    enableResizing: false,
    cell: ({ row, table }) => {
      const r = row.original;
      const disabled = r.status !== "PENDING";
      return (
        <div className="flex gap-2">
          <Button
            size="sm"
            disabled={disabled}
            onClick={() => table.options.meta?.onIssue?.(r.id, r)}
            data-testid={`issue-btn-${r.id}`}
            className="cursor-pointer"
          >
            再発行
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={disabled}
            onClick={() => table.options.meta?.onReject?.(r.id, r)}
            data-testid={`reject-btn-${r.id}`}
            className="cursor-pointer"
          >
            拒否
          </Button>
        </div>
      );
    },
  },

  // hidden 検索列（ユーザID/メール/ユーザ名/処理者）
  {
    id: "q",
    accessorFn: (r) =>
      `${r.userId} ${r.email} ${r.userName} ${r.processedBy ?? ""} ${r.note ?? ""}`.toLowerCase(),
    enableHiding: true,
    enableSorting: false,
    enableResizing: false,
    size: 0,
    header: () => null,
    cell: () => null,
  },
];
