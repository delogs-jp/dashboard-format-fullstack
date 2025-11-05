// src/app/(protected)/masters/menus/columns.tsx
"use client";
import type { ColumnDef, HeaderContext } from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowUp,
  SlidersVertical,
  LoaderCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { MenuRecord, MatchMode } from "@/lib/sidebar/menu.schema";
import { Switch } from "@/components/ui/switch";
import { SortButton } from "@/components/datagrid/sort-button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { StatusFilter } from "@/components/filters/status-filter";

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

function IndentedTitle({ title, depth }: { title: string; depth: number }) {
  const cls = depth === 0 ? "" : depth === 1 ? "pl-4" : "pl-10";
  return <div className={cls}>{title}</div>;
}
function MatchBadge({ mode }: { mode: MatchMode | undefined }) {
  const m = mode ?? "prefix";
  if (m === "exact") return <Badge variant="secondary">exact</Badge>;
  if (m === "regex") return <Badge variant="outline">regex</Badge>;
  return <Badge>prefix</Badge>;
}

export type RowShape = MenuRecord & {
  depth: number;
  canUp: boolean;
  canDown: boolean;
  effMinPriority?: number; // ★ 追加：継承適用後
};

export const columns: ColumnDef<RowShape>[] = [
  {
    accessorKey: "displayId",
    header: (ctx) => <HeaderWithSort title="表示ID" ctx={ctx} />,
    size: 86,
    enableResizing: false,
    cell: ({ row }) => (
      <span className="font-mono">{row.original.displayId}</span>
    ),
  },
  {
    accessorKey: "title",
    header: (ctx) => <HeaderWithSort title="タイトル" ctx={ctx} />,
    cell: ({ row }) => (
      <IndentedTitle title={row.original.title} depth={row.original.depth} />
    ),
  },
  {
    accessorKey: "href",
    header: (ctx) => <HeaderWithSort title="Path" ctx={ctx} />,
    cell: ({ row }) =>
      row.original.isSection ? (
        <span className="text-muted-foreground">—</span>
      ) : (
        <span className="font-mono">{row.original.href}</span>
      ),
  },
  {
    id: "match",
    header: (ctx) => <HeaderWithSort title="一致" ctx={ctx} />,
    size: 80,
    enableResizing: false,
    cell: ({ row }) =>
      row.original.isSection ? (
        <span className="text-muted-foreground">—</span>
      ) : (
        <MatchBadge mode={row.original.match} />
      ),
  },
  {
    accessorKey: "minPriority",
    header: (ctx) => <HeaderWithSort title="しきい値" ctx={ctx} />,
    size: 80,
    enableResizing: false,
    accessorFn: (row) => row.effMinPriority ?? -1,
    cell: ({ row }) => {
      const v = row.original.effMinPriority;
      return v === undefined ? (
        <span className="text-muted-foreground">（全員）</span>
      ) : (
        <span className="font-mono tabular-nums">{v}</span>
      );
    },
  },
  {
    id: "order",
    header: (ctx) => <HeaderWithSort title="順序" ctx={ctx} />,
    size: 96,
    enableResizing: false,
    enableSorting: true,
    cell: ({ row, table }) => {
      const { canUp, canDown } = row.original;
      const onUp = table.options.meta?.onMoveUp;
      const onDown = table.options.meta?.onMoveDown;
      // ★ 処理中？
      const moving = table.options.meta?.movingIds?.has(row.original.displayId);
      if (moving) {
        return (
          <div className="flex h-8 items-center justify-start">
            <LoaderCircle className="text-muted-foreground h-4 w-4 animate-spin" />
          </div>
        );
      }
      return (
        <div className="flex gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="outline"
                className="size-8 cursor-pointer"
                onClick={() => onUp?.(row.original.displayId, row.original)}
                disabled={!canUp}
                aria-label="ひとつ上へ"
              >
                <ArrowUp />
              </Button>
            </TooltipTrigger>
            <TooltipContent>ひとつ上へ</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="outline"
                className="size-8 cursor-pointer"
                onClick={() => onDown?.(row.original.displayId, row.original)}
                disabled={!canDown}
                aria-label="ひとつ下へ"
              >
                <ArrowDown />
              </Button>
            </TooltipTrigger>
            <TooltipContent>ひとつ下へ</TooltipContent>
          </Tooltip>
        </div>
      );
    },
  },
  {
    id: "visible",
    // 可視 = !hidden をフィルタ＆表示
    header: (ctx) => {
      const status = ctx.table.options.meta?.status ?? "ALL";
      const setStatus = ctx.table.options.meta?.setStatus ?? (() => {});
      const active = status !== "ALL";
      return (
        <div className="flex items-center gap-1">
          <span className="whitespace-nowrap">可視</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant={active ? "default" : "outline"}
                className="h-7 w-7 cursor-pointer"
                aria-label="可視のフィルタ"
                title="可視のフィルタ"
              >
                <SlidersVertical className="h-3.5 w-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[220px] p-0">
              <StatusFilter
                value={status}
                onChange={setStatus}
                labels={{
                  all: "すべて",
                  active: "可視のみ",
                  inactive: "非表示のみ",
                }}
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
            </PopoverContent>
          </Popover>
        </div>
      );
    },
    size: 70,
    enableResizing: false,
    enableSorting: true,
    cell: ({ row, table }) => {
      const onToggle = table.options.meta?.onToggleActive; // シグネチャは流用
      const visible = !row.original.hidden;
      // ★ ここで保護チェック
      const protectedRow = !!row.original.lockHiddenOverride;
      // ★ 期待状態があるならそれを優先表示（旧→新のチラつきを防ぐ）
      const pv = table.options.meta?.pendingVisible?.get(
        row.original.displayId,
      );
      const displayVisible = typeof pv === "boolean" ? pv : visible;
      // ★ 処理中？
      const toggling = table.options.meta?.togglingIds?.has(
        row.original.displayId,
      );
      // 保護対象なら常に disabled、Tooltip で理由を表示
      if (protectedRow) {
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="opacity-60">
                <Switch
                  checked={displayVisible}
                  disabled
                  aria-label="可視/非表示"
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>このページからは非表示にできません</TooltipContent>
          </Tooltip>
        );
      }
      if (toggling) {
        // スイッチ自体は期待状態で描画しつつ、半透明＋上にクルクルでもOK
        // 単純にスピナーだけでも可。ここでは“スイッチを無効化＋期待状態”にして自然に。
        return (
          <div className="relative flex items-center justify-start">
            <Switch
              checked={displayVisible}
              disabled
              aria-label="可視/非表示"
            />
            <div className="absolute">
              <LoaderCircle className="text-muted-foreground h-4 w-4 animate-spin" />
            </div>
          </div>
        );
      }
      return (
        <Switch
          checked={visible}
          onCheckedChange={(next) =>
            onToggle?.(row.original.displayId, next, row.original)
          }
          className="cursor-pointer"
          aria-label="可視/非表示"
        />
      );
    },
    // filter: StatusFilter と合わせる（可視/非表示）
    filterFn: (row, _id, value: "ALL" | "ACTIVE" | "INACTIVE") =>
      value === "ALL"
        ? true
        : value === "ACTIVE"
          ? !row.original.hidden
          : row.original.hidden,
  },
  // 検索用 hidden 列
  {
    id: "q",
    accessorFn: (r) =>
      `${r.displayId} ${r.title} ${r.href ?? ""}`.toLowerCase(),
    enableHiding: true,
    enableSorting: false,
    enableResizing: false,
    size: 0,
    header: () => null,
    cell: () => null,
  },
];
