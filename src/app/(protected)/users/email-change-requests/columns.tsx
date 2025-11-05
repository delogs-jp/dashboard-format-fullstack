// src/app/(protected)/users/email-change-requests/columns.tsx
"use client";

import type { ColumnDef, HeaderContext } from "@tanstack/react-table";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import * as punycode from "punycode/";
import type { EmailChangeRow } from "./data-table";
import { SlidersVertical } from "lucide-react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { DateRangePicker } from "@/components/filters/date-range-picker";
import { SortButton } from "@/components/datagrid/sort-button";
import { StatusMultiSelect, type ReqStatus } from "./status-multi-select";
import { RolesChecklist } from "@/components/filters/roles-checklist";

function fmt(d?: Date | null) {
  if (!d) return "-";
  return format(d, "yyyy/MM/dd HH:mm", { locale: ja });
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

export const columns: ColumnDef<EmailChangeRow>[] = [
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
          title="申請日時"
          active={active}
          contentClassName="w-[268px] md:w-[520px] max-w-[90vw]"
          trailing={
            <SortButton
              column={ctx.column}
              aria-label="申請日時でソート"
              title="申請日時でソート"
            />
          }
        >
          <DateRangePicker label="申請日時" value={r} onChange={setR} />
        </HeaderWithFilter>
      );
    },
    cell: ({ row }) => fmt(row.original.requestedAt),
  },
  {
    accessorKey: "accountId",
    header: (ctx) => <HeaderWithSort title="アカウントID" ctx={ctx} />,
  },
  {
    accessorKey: "userName",
    header: (ctx) => <HeaderWithSort title="ユーザ名" ctx={ctx} />,
  },
  // ★ 追加：申請者ロール（バッジ色つき）
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
  {
    accessorKey: "oldEmail",
    header: (ctx) => <HeaderWithSort title="旧メール" ctx={ctx} />,
    cell: ({ row }) => punycode.toUnicode(row.original.oldEmail),
  },
  {
    accessorKey: "newEmail",
    header: (ctx) => <HeaderWithSort title="新メール" ctx={ctx} />,
    cell: ({ row }) => (
      <span title={row.original.newEmail}>
        {punycode.toUnicode(row.original.newEmail)}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: (ctx) => {
      const table = ctx.table;
      const statusOptions = table.options.meta?.statusOptions ?? [];
      const rawSelected = table.options.meta?.statuses ?? []; // URL/状態同期の生値（[]=すべて）
      const all = statusOptions.map((o) => o.value);
      const statuses = rawSelected.length ? rawSelected : all; // UI上の見かけの選択
      const setStatuses: (next: ReqStatus[]) => void =
        table.options.meta?.setStatuses ?? (() => {});
      const active = (rawSelected?.length ?? 0) > 0;
      return (
        <HeaderWithFilter title="状態" active={active}>
          <StatusMultiSelect
            options={statusOptions}
            value={statuses}
            onChange={setStatuses}
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
      if (s === "APPROVED") return <Badge>承認済</Badge>;
      if (s === "REJECTED") return <Badge variant="destructive">却下</Badge>;
      if (s === "VERIFIED") return <Badge variant="outline">本人確認済</Badge>;
      if (s === "PENDING") return <Badge variant="outline">未認証</Badge>;
      if (s === "EXPIRED") return <Badge variant="secondary">期限切れ</Badge>;
      return <Badge variant="secondary">{s}</Badge>;
    },
  },
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
  {
    accessorKey: "processedBy",
    header: (ctx) => <HeaderWithSort title="処理者" ctx={ctx} />,
  },

  {
    id: "actions",
    header: "操作",
    enableSorting: false,
    enableResizing: false,
    cell: ({ row, table }) => {
      const r = row.original;
      const canOperate = r.status === "VERIFIED";
      return (
        <div className="flex gap-2">
          <Button
            size="sm"
            disabled={!canOperate}
            onClick={() => table.options.meta?.onApprove?.(r.id, r)}
            data-testid={`approve-btn-${r.id}`}
            className="cursor-pointer"
          >
            承認
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!["PENDING", "VERIFIED"].includes(r.status)}
            onClick={() => table.options.meta?.onReject?.(r.id, r)}
            data-testid={`reject-btn-${r.id}`}
            className="cursor-pointer"
          >
            却下
          </Button>
        </div>
      );
    },
  },
  // hidden 検索列（q）
  {
    id: "q",
    accessorFn: (r) =>
      `${r.accountId} ${r.userName} ${r.oldEmail} ${r.newEmail}`.toLowerCase(),
    enableHiding: true,
    enableSorting: false,
    enableResizing: false,
    size: 0,
    header: () => null,
    cell: () => null,
  },
];
