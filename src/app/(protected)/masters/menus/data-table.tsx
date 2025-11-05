// src/app/(protected)/masters/menus/data-table.tsx
"use client";

import * as React from "react";
import type {
  ColumnDef,
  VisibilityState,
  SortingState,
} from "@tanstack/react-table";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Table } from "@/components/datagrid/table-container";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { MenuRecord } from "@/lib/sidebar/menu.schema";
import type { RowShape } from "./columns";
import { DatagridToolbar } from "@/components/datagrid/datagrid-toolbar";
import { DatagridSummary } from "@/components/datagrid/datagrid-summary";
import { DatagridPagination } from "@/components/datagrid/datagrid-pagination";
import { useDatagridQueryState } from "@/lib/datagrid/use-datagrid-query-state";
import { usePersistentDatagridState } from "@/lib/datagrid/use-persistent-datagrid-state";
import { buildCsv, downloadCsv } from "@/lib/datagrid/csv";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { useRouter } from "next/navigation";

// サーバーアクション
import {
  moveMenuOrderAction,
  toggleMenuHiddenAction,
} from "@/app/_actions/menus/update";

// 既存ユーティリティ再利用
function calcDepthMap(rows: MenuRecord[]): Map<string, number> {
  const parentById = new Map<string, string | null>();
  rows.forEach((r) => parentById.set(r.displayId, r.parentId));
  const depthById = new Map<string, number>();
  const depthOf = (id: string | null | undefined): number => {
    if (!id) return 0;
    if (depthById.has(id)) return depthById.get(id)!;
    const p = parentById.get(id);
    const d = p ? 1 + depthOf(p) : 0;
    depthById.set(id, d);
    return d;
  };
  rows.forEach((r) => depthOf(r.displayId));
  return depthById;
}

function withMoveFlags<T extends MenuRecord>(rows: T[]) {
  const byParent = new Map<string | null, MenuRecord[]>();
  rows.forEach((r) => {
    const key = r.parentId ?? null;
    const arr = byParent.get(key) ?? [];
    arr.push(r);
    byParent.set(key, arr);
  });
  const flags = new Map<string, { canUp: boolean; canDown: boolean }>();
  for (const [, arr] of byParent) {
    arr
      .slice()
      .sort((a, b) => a.order - b.order)
      .forEach((r, i, list) => {
        flags.set(r.displayId, { canUp: i > 0, canDown: i < list.length - 1 });
      });
  }
  return rows.map((r) => ({
    ...r,
    ...(flags.get(r.displayId) ?? { canUp: false, canDown: false }),
  })) as Array<T & { canUp: boolean; canDown: boolean }>;
}

// しきい値の継承を付与（自分→親→祖父... の順で最初に見つかった値）
function attachEffectiveMinPriority<T extends MenuRecord>(rows: T[]) {
  const byId = new Map(rows.map((r) => [r.displayId, r]));
  const memo = new Map<string, number | undefined>();

  const getEff = (id: string): number | undefined => {
    if (memo.has(id)) return memo.get(id);
    const self = byId.get(id);
    if (!self) return undefined;
    const v =
      self.minPriority ?? (self.parentId ? getEff(self.parentId) : undefined);
    memo.set(id, v);
    return v;
  };

  return rows.map((r) => ({
    ...r,
    effMinPriority: getEff(r.displayId),
  })) as Array<T & { effMinPriority?: number }>;
}

type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE";

type Props = {
  columns: ColumnDef<RowShape, unknown>[];
  data: MenuRecord[]; // SSR整列済み
  canDownloadData?: boolean;
  canEditData?: boolean;
};

export default function DataTable({
  columns,
  data,
  canDownloadData = false,
  canEditData = false,
}: Props) {
  const router = useRouter();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  // ★ 行ごとの処理中管理
  // ★ pending: 「この行は最終的に 'visible = X' になるはず」を覚えておく
  const [togglingIds, setTogglingIds] = React.useState<Set<string>>(new Set());
  const [pendingVisible, setPendingVisible] = React.useState<
    Map<string, boolean>
  >(new Map());
  // ★ 並び替えの処理中（行単位）
  const [movingIds, setMovingIds] = React.useState<Set<string>>(new Set());

  // クライアント状態（検索/フィルタ）
  const [queryState, setQueryState] = useDatagridQueryState(
    "menus",
    {
      q: "",
      status: "ALL" as StatusFilter,
      cols: [
        "displayId",
        "title",
        "href",
        "minPriority",
        "order",
        "visible",
      ] as string[],
    },
    { persistKey: "menus" },
  );

  const setQ = (v: string) => setQueryState((s) => ({ ...s, q: v }));
  const setStatus = (next: StatusFilter) =>
    setQueryState((s) => ({ ...s, status: next }));
  const setVisibleColumnIds = (ids: string[]) =>
    setQueryState((s) => ({ ...s, cols: ids }));

  // 可視列（初回SSRは全列表示に合わせる）
  const allColumnIds = React.useMemo(
    () =>
      [
        "displayId",
        "title",
        "href",
        "match",
        "minPriority",
        "order",
        "visible",
      ] as const,
    [],
  );
  type ColId = (typeof allColumnIds)[number];
  const [persisted, setPersisted] = usePersistentDatagridState("menus", {
    pageSize: 20,
  });
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "order", desc: false },
  ]);

  // 可視列
  const effectiveVisibleColumnIds: ColId[] = mounted
    ? (queryState.cols as ColId[])
    : (Array.from(allColumnIds) as ColId[]);
  const columnVisibility = React.useMemo<VisibilityState>(() => {
    const set = new Set(effectiveVisibleColumnIds);
    return {
      q: false,
      actions: false,
      displayId: set.has("displayId"),
      title: set.has("title"),
      href: set.has("href"),
      match: set.has("match"),
      minPriority: set.has("minPriority"),
      order: set.has("order"),
      visible: set.has("visible"),
    };
  }, [effectiveVisibleColumnIds]);

  // 表示行（depth と ↑↓ 可否を付与）
  const rows = React.useMemo(() => {
    const depth = calcDepthMap(data);
    const withDepth = data.map((r) => ({
      ...r,
      depth: Math.min(depth.get(r.displayId) ?? 0, 2),
    }));
    const withEffMin = attachEffectiveMinPriority(withDepth);
    return withMoveFlags(withEffMin);
  }, [data]);

  // フィルタ（階層順を保持）
  const filtered = React.useMemo(() => {
    const needle = queryState.q.trim().toLowerCase();
    return rows.filter((r) => {
      const passQ =
        !needle ||
        `${r.displayId} ${r.title} ${r.href ?? ""}`
          .toLowerCase()
          .includes(needle);
      const visible = !r.hidden;
      const passStatus =
        queryState.status === "ALL" ||
        (queryState.status === "ACTIVE" ? visible : !visible);
      return passQ && passStatus;
    });
  }, [rows, queryState.q, queryState.status]);

  // ★ “現在の並び”を表すシグネチャ（displayId:order）で変化検知
  const orderSig = React.useMemo(
    () => data.map((d) => `${d.displayId}:${d.order}`).join("|"),
    [data],
  );
  const prevOrderSigRef = React.useRef(orderSig);

  // refresh で order が変わったら処理中フラグを解除
  React.useEffect(() => {
    if (prevOrderSigRef.current !== orderSig) {
      prevOrderSigRef.current = orderSig;
      setMovingIds(new Set()); // 一括解除
    }
  }, [orderSig]);

  // 不変更新ユーティリティ
  const addMoving = (ids: string[]) =>
    setMovingIds((prev) => new Set([...prev, ...ids]));

  const delToggling = (id: string) =>
    setTogglingIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });

  const withMoving = async <T,>(
    ids: string[],
    fn: () => Promise<T>,
  ): Promise<T> => {
    addMoving(ids);
    const res = await fn();
    // 解除は orderSig 変化の useEffect が担当（ここでは外さない）
    return res;
  };

  // 兄弟のペアIDを拾って両方を処理中にする
  const onMoveUp = async (displayId: string) => {
    const me = rows.find((r) => r.displayId === displayId);
    if (!me) return;
    const siblings = rows
      .filter((r) => r.parentId === me.parentId)
      .sort((a, b) => a.order - b.order);
    const i = siblings.findIndex((r) => r.displayId === displayId);
    const pair = siblings[i - 1];
    const ids = pair ? [displayId, pair.displayId] : [displayId];

    await withMoving(ids, async () => {
      const res = await moveMenuOrderAction(displayId, "up");
      if (res.ok) React.startTransition(() => router.refresh());
      return res;
    });
  };

  const onMoveDown = async (displayId: string) => {
    const me = rows.find((r) => r.displayId === displayId);
    if (!me) return;
    const siblings = rows
      .filter((r) => r.parentId === me.parentId)
      .sort((a, b) => a.order - b.order);
    const i = siblings.findIndex((r) => r.displayId === displayId);
    const pair = siblings[i + 1];
    const ids = pair ? [displayId, pair.displayId] : [displayId];

    await withMoving(ids, async () => {
      const res = await moveMenuOrderAction(displayId, "down");
      if (res.ok) React.startTransition(() => router.refresh());
      return res;
    });
  };

  // 可視トグル：開始時に pending+spinner を立て、data更新で自動解除
  const onToggleActive = async (displayId: string, nextVisible: boolean) => {
    setPendingVisible((prev) => new Map(prev).set(displayId, nextVisible));
    setTogglingIds((prev) => new Set(prev).add(displayId));
    const res = await toggleMenuHiddenAction(displayId, !nextVisible);
    if (res.ok) React.startTransition(() => router.refresh());
    else {
      setPendingVisible((prev) => {
        const m = new Map(prev);
        m.delete(displayId);
        return m;
      });
      delToggling(displayId);
    }
  };

  // data更新で期待状態になった行のトグル “処理中” を解除
  React.useEffect(() => {
    if (pendingVisible.size === 0) return;
    let changed = false;
    const nextPending = new Map(pendingVisible);
    const nextToggling = new Set(togglingIds);
    for (const [id, v] of pendingVisible) {
      const row = data.find((r) => r.displayId === id);
      if (row && !row.hidden === v) {
        nextPending.delete(id);
        nextToggling.delete(id);
        changed = true;
      }
    }
    if (changed) {
      setPendingVisible(nextPending);
      setTogglingIds(nextToggling);
    }
  }, [data, pendingVisible, togglingIds]);

  const table = useReactTable({
    data: filtered as RowShape[],
    columns,
    state: { sorting, columnVisibility },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageIndex: 0, pageSize: 20 } },
    meta: {
      onMoveUp,
      onMoveDown,
      onToggleActive,
      // ★ 追加：処理中セットを列側へ
      movingIds,
      togglingIds,
      pendingVisible,
      status: queryState.status,
      setStatus,
    },
  });

  // ページサイズの保存
  React.useEffect(() => {
    if (mounted) table.setPageSize(persisted.pageSize);
  }, [mounted, persisted.pageSize, table]);

  // CSV（可視列のみ／ヘッダは日本語表示）
  const columnLabels = React.useMemo(
    () =>
      ({
        displayId: "表示ID",
        title: "タイトル",
        href: "Path",
        match: "一致",
        minPriority: "しきい値",
        order: "順序",
        visible: "可視",
      }) as const,
    [],
  );

  const onDownloadCsv = React.useCallback(() => {
    const visibleLeaf = table
      .getVisibleLeafColumns()
      .map((c) => c.id)
      .filter((id) => id !== "q") as ColId[];

    const headers = visibleLeaf.map((id) => columnLabels[id]);

    const rowsCsv = filtered.map((r) =>
      visibleLeaf.map((id) => {
        switch (id) {
          case "displayId":
            return r.displayId;
          case "title":
            return r.title;
          case "href":
            return r.href ?? "";
          case "match":
            return r.match ?? "";
          case "minPriority":
            return r.effMinPriority ?? "";
          case "order":
            return r.order;
          case "visible":
            return !r.hidden ? "可視" : "非表示";
          default:
            return "";
        }
      }),
    );

    const csv = buildCsv(headers, rowsCsv);
    const ts = format(new Date(), "yyyyMMdd_HHmmss", { locale: ja });
    downloadCsv(`menus_${ts}.csv`, csv);
  }, [filtered, table, columnLabels]);

  return (
    <div className="space-y-3">
      <DatagridToolbar<ColId>
        qTitle={`${columnLabels.displayId}/${columnLabels.title}/${columnLabels.href}`}
        q={queryState.q}
        onChangeQ={setQ}
        columnOptions={Array.from(allColumnIds).map((id) => ({
          value: id,
          label: columnLabels[id],
        }))}
        visibleColumnIds={effectiveVisibleColumnIds}
        onChangeVisibleColumns={setVisibleColumnIds}
        canDownloadData={canDownloadData}
        onDownloadCsv={onDownloadCsv}
        canEditData={false}
      />

      {/* 件数・サマリ */}
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm">表示件数： {filtered.length} 件</div>
        <div className="flex max-w-[60%] items-center justify-end gap-2">
          <DatagridSummary
            mounted={mounted}
            statusText={
              queryState.status === "ALL"
                ? "可視: すべて"
                : queryState.status === "ACTIVE"
                  ? "可視: 可視のみ"
                  : "可視: 非表示のみ"
            }
            visibleColsText={effectiveVisibleColumnIds
              .map((id) => columnLabels[id])
              .join(", ")}
          />
          <button
            type="button"
            className="text-muted-foreground shrink-0 cursor-pointer text-xs underline"
            onClick={() => {
              setQueryState((s) => ({
                ...s,
                q: "",
                status: "ALL",
                cols: [
                  "displayId",
                  "title",
                  "href",
                  "minPriority",
                  "order",
                  "visible",
                ] as ColId[],
              }));
              setPersisted((p) => ({ ...p, pageSize: 20 }));
              table.setPageSize(20);
            }}
            title="全フィルタ解除"
          >
            全フィルタ解除
          </button>
        </div>
      </div>

      {/* テーブル */}
      <div className="overflow-x-auto rounded-md border pb-1">
        <Table
          className="w-full"
          data-testid="menus-table"
          containerClassName={
            !canDownloadData && !canEditData
              ? "max-h-[calc(100svh_-_244px)] md:max-h-[calc(100svh_-_224px)] overflow-y-auto pb-1"
              : "max-h-[calc(100svh_-_284px)] md:max-h-[calc(100svh_-_224px)] overflow-y-auto pb-1"
          }
        >
          <TableHeader className="bg-muted/60 supports-[backdrop-filter]:bg-muted/60 sticky top-0 z-20 text-xs backdrop-blur">
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    style={{ width: header.column.getSize() }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      style={{ width: cell.column.getSize() }}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={table.getAllColumns().length}
                  className="text-muted-foreground py-10 text-center text-sm"
                >
                  条件に一致するメニューが見つかりませんでした。
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <DatagridPagination
        table={table}
        pageSize={table.getState().pagination.pageSize}
        onChangePageSize={(n) => {
          table.setPageSize(n);
          setPersisted((p) => ({ ...p, pageSize: n }));
        }}
      />
    </div>
  );
}
