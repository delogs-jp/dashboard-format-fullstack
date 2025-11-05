// src/app/(protected)/masters/roles/data-table.tsx
"use client";

import * as React from "react";
import type {
  ColumnDef,
  SortingState,
  VisibilityState,
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
import type { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import type { DepartmentRoleRow } from "./columns";

import { useDatagridQueryState } from "@/lib/datagrid/use-datagrid-query-state";
import { usePersistentDatagridState } from "@/lib/datagrid/use-persistent-datagrid-state";
import { fromDateRange, toDateRange } from "@/lib/datagrid/date-io";
import { buildCsv, downloadCsv, fmtDateTime } from "@/lib/datagrid/csv";

import { DatagridToolbar } from "@/components/datagrid/datagrid-toolbar";
import { DatagridSummary } from "@/components/datagrid/datagrid-summary";
import { DatagridPagination } from "@/components/datagrid/datagrid-pagination";

type Props = {
  columns: ColumnDef<DepartmentRoleRow, unknown>[];
  data: DepartmentRoleRow[];
  kindOptions: { value: string; label: string }[];
  canDownloadData?: boolean;
  canEditData?: boolean;
};

export default function DataTable({
  columns,
  data,
  kindOptions,
  canDownloadData = false,
  canEditData = false,
}: Props) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const allColumnIds = React.useMemo(
    () =>
      [
        "displayId",
        "code",
        "kind",
        "nameEffective",
        "priority",
        "canEditData",
        "canDownloadData",
        "isEnabledInDepartment",
        "remarks",
        "createdAt",
        "updatedAt",
      ] as const,
    [],
  );
  type ColId = (typeof allColumnIds)[number];

  // URL同期（ロール一覧専用の名前空間）
  const [queryState, setQueryState] = useDatagridQueryState(
    "masters-roles",
    {
      q: "",
      kinds: [] as string[], // 空配列＝全種別
      status: "ALL" as "ALL" | "ACTIVE" | "INACTIVE",
      createdRange: undefined as { from?: string; to?: string } | undefined,
      updatedRange: undefined as { from?: string; to?: string } | undefined,
      cols: Array.from(allColumnIds) as ColId[],
    },
    { persistKey: "masters-roles" },
  );

  const allKinds = React.useMemo(
    () => kindOptions.map((o) => o.value),
    [kindOptions],
  );
  const kindsForFilter = queryState.kinds.length ? queryState.kinds : allKinds;

  const createdRange = React.useMemo(
    () => toDateRange(queryState.createdRange),
    [queryState.createdRange],
  );
  const updatedRange = React.useMemo(
    () => toDateRange(queryState.updatedRange),
    [queryState.updatedRange],
  );

  const setQ = (v: string) => setQueryState((s) => ({ ...s, q: v }));
  const setKinds = (next: string[]) =>
    setQueryState((s) => ({ ...s, kinds: next }));
  const setStatus = (next: "ALL" | "ACTIVE" | "INACTIVE") =>
    setQueryState((s) => ({ ...s, status: next }));
  const setCreatedRange = (r?: DateRange) =>
    setQueryState((s) => ({ ...s, createdRange: fromDateRange(r) }));
  const setUpdatedRange = (r?: DateRange) =>
    setQueryState((s) => ({ ...s, updatedRange: fromDateRange(r) }));
  const setVisibleColumnIds = (ids: ColId[]) =>
    setQueryState((s) => ({ ...s, cols: ids }));

  // ページサイズの永続化
  const [persisted, setPersisted] = usePersistentDatagridState(
    "masters-roles",
    { pageSize: 20 },
  );

  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "priority", desc: false }, // 既定は優先度の昇順
  ]);

  const columnLabels = React.useMemo(
    () =>
      ({
        displayId: "表示ID",
        code: "コード",
        kind: "種別",
        nameEffective: "表示名",
        priority: "優先度",
        canEditData: "編集可",
        canDownloadData: "DL可",
        isEnabledInDepartment: "状態",
        remarks: "備考",
        createdAt: "登録日時",
        updatedAt: "更新日時",
      }) as const,
    [],
  );

  const effectiveVisibleColumnIds: ColId[] = mounted
    ? (queryState.cols as ColId[])
    : (Array.from(allColumnIds) as ColId[]);
  const columnVisibility = React.useMemo<VisibilityState>(() => {
    const set = new Set(effectiveVisibleColumnIds);
    return {
      actions: true,
      q: false,
      displayId: set.has("displayId"),
      code: set.has("code"),
      kind: set.has("kind"),
      nameEffective: set.has("nameEffective"),
      priority: set.has("priority"),
      canEditData: set.has("canEditData"),
      canDownloadData: set.has("canDownloadData"),
      isEnabledInDepartment: set.has("isEnabledInDepartment"),
      remarks: set.has("remarks"),
      createdAt: set.has("createdAt"),
      updatedAt: set.has("updatedAt"),
    };
  }, [effectiveVisibleColumnIds]);

  // フィルタ
  const filteredData = React.useMemo(() => {
    const needle = queryState.q.trim().toLowerCase();
    const kindSet = new Set(kindsForFilter);
    const inRange = (d: Date, r?: DateRange) => {
      if (!r?.from && !r?.to) return true;
      const ts = d.getTime();
      if (r?.from && ts < new Date(r.from).setHours(0, 0, 0, 0)) return false;
      if (r?.to && ts > new Date(r.to).setHours(23, 59, 59, 999)) return false;
      return true;
    };

    return data.filter((r) => {
      const passQ =
        !needle ||
        `${r.displayId} ${r.code} ${r.nameEffective} ${r.remarks ?? ""}`
          .toLowerCase()
          .includes(needle);
      const passKind = kindSet.has(r.kind);
      const passStatus =
        queryState.status === "ALL" ||
        (queryState.status === "ACTIVE"
          ? r.isEnabledInDepartment
          : !r.isEnabledInDepartment);
      const passCreated = inRange(r.createdAt, createdRange);
      const passUpdated = inRange(r.updatedAt, updatedRange);
      return passQ && passKind && passStatus && passCreated && passUpdated;
    });
  }, [
    data,
    queryState.q,
    queryState.status,
    kindsForFilter,
    createdRange,
    updatedRange,
  ]);

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting, columnVisibility },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageIndex: 0, pageSize: 20 } },
    meta: {
      kindOptions,
      kinds: kindsForFilter,
      setKinds,
      status: queryState.status,
      setStatus,
      createdRange,
      setCreatedRange,
      updatedRange,
      setUpdatedRange,
    },
  });

  React.useEffect(() => {
    if (mounted) table.setPageSize(persisted.pageSize);
  }, [mounted, persisted.pageSize, table]);

  // CSV（可視列のみ）
  const onDownloadCsv = React.useCallback(() => {
    const visibleLeaf = table
      .getVisibleLeafColumns()
      .map((c) => c.id)
      .filter((id) => id !== "actions" && id !== "q") as ColId[];

    const headers = visibleLeaf.map((id) => columnLabels[id]);

    const rows = filteredData.map((r) =>
      visibleLeaf.map((id) => {
        switch (id) {
          case "displayId":
            return r.displayId;
          case "code":
            return r.code;
          case "kind":
            return r.kind === "role"
              ? "ベース"
              : r.kind === "override"
                ? "上書き"
                : "部署ローカル";
          case "nameEffective":
            return r.nameEffective;
          case "priority":
            return r.priority;
          case "canEditData":
            return r.canEditData ? "可" : "不可";
          case "canDownloadData":
            return r.canDownloadData ? "可" : "不可";
          case "isEnabledInDepartment":
            return r.isEnabledInDepartment ? "有効" : "無効";
          case "remarks":
            return r.remarks ?? "";
          case "createdAt":
            return fmtDateTime(r.createdAt);
          case "updatedAt":
            return fmtDateTime(r.updatedAt);
          default:
            return "";
        }
      }),
    );

    const csv = buildCsv(headers, rows);
    const ts = format(new Date(), "yyyyMMdd_HHmmss", { locale: ja });
    downloadCsv(`roles_${ts}.csv`, csv);
  }, [filteredData, table, columnLabels]);

  const kindText =
    queryState.kinds.length === 0
      ? "種別: すべて"
      : `種別: ${queryState.kinds
          .map(
            (v) =>
              new Map(kindOptions.map((o) => [o.value, o.label])).get(v) ?? v,
          )
          .join(", ")}`;
  const statusText =
    queryState.status === "ALL"
      ? "状態: すべて"
      : queryState.status === "ACTIVE"
        ? "状態: 有効"
        : "状態: 無効";
  const visibleColsText = (
    mounted ? effectiveVisibleColumnIds : (Array.from(allColumnIds) as ColId[])
  )
    .map((id) => columnLabels[id])
    .join(", ");

  const filteredCount = filteredData.length;

  return (
    <div className="space-y-3">
      <DatagridToolbar<ColId>
        qTitle={`${columnLabels.displayId}/${columnLabels.code}/${columnLabels.nameEffective}/${columnLabels.remarks}`}
        q={queryState.q}
        onChangeQ={setQ}
        columnOptions={allColumnIds.map((id) => ({
          value: id,
          label: columnLabels[id],
        }))}
        visibleColumnIds={effectiveVisibleColumnIds}
        onChangeVisibleColumns={setVisibleColumnIds}
        canDownloadData={canDownloadData}
        onDownloadCsv={onDownloadCsv}
        canEditData={canEditData}
        newHref="/masters/roles/new"
      />

      <div className="flex items-center justify-between gap-3">
        <div className="text-sm" data-testid="count">
          表示件数： {filteredCount} 件
        </div>
        <div className="flex max-w-[60%] items-center justify-end gap-2">
          <DatagridSummary
            mounted={mounted}
            roleText={kindText}
            statusText={statusText}
            createdTitle="登録"
            updatedTitle="更新"
            createdRangeISO={queryState.createdRange}
            updatedRangeISO={queryState.updatedRange}
            createdRange={createdRange}
            updatedRange={updatedRange}
            visibleColsText={visibleColsText}
          />
          <button
            type="button"
            className="text-muted-foreground shrink-0 cursor-pointer text-xs underline"
            onClick={() => {
              setQueryState((s) => ({
                ...s,
                q: "",
                kinds: [],
                status: "ALL",
                createdRange: undefined,
                updatedRange: undefined,
                cols: Array.from(allColumnIds) as ColId[],
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

      <div className="overflow-x-auto rounded-md border pb-1">
        <Table
          className="w-full"
          data-testid="roles-table"
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
                <TableRow
                  key={row.id}
                  data-testid={`row-${(row.original as DepartmentRoleRow).displayId}`}
                >
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
                  条件に一致するロールが見つかりませんでした。
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <DatagridPagination<DepartmentRoleRow>
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
