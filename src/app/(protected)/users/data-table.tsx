// src/app/(protected)/users/data-table.tsx（薄型版）
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

import type { UserRow } from "./columns";
import type { RoleOption } from "@/components/filters/roles-checklist";

// 共通フック＆ユーティリティ
import { useDatagridQueryState } from "@/lib/datagrid/use-datagrid-query-state";
import { usePersistentDatagridState } from "@/lib/datagrid/use-persistent-datagrid-state";
import { fromDateRange, toDateRange } from "@/lib/datagrid/date-io";
import { buildCsv, downloadCsv, fmtDateTime } from "@/lib/datagrid/csv";

// UI 部品
import { DatagridToolbar } from "@/components/datagrid/datagrid-toolbar";
import { DatagridSummary } from "@/components/datagrid/datagrid-summary";
import { DatagridPagination } from "@/components/datagrid/datagrid-pagination";

type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE";

type Props = {
  columns: ColumnDef<UserRow, unknown>[];
  data: UserRow[];
  roleOptions: RoleOption[];
  canDownloadData?: boolean;
  canEditData?: boolean;
};

export default function DataTable({
  columns,
  data,
  roleOptions,
  canDownloadData = false,
  canEditData = false,
}: Props) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  // 列ID（actions / q 除外）
  const allColumnIds = React.useMemo(
    () =>
      [
        "displayId",
        "name",
        "email",
        "roleCode",
        "isActive",
        "phone",
        "remarks",
        "createdAt",
        "updatedAt",
      ] as const,
    [],
  );
  type ColId = (typeof allColumnIds)[number];

  // URL同期（roles:[]＝すべて、cols: 表示列もURLに保持）
  const [queryState, setQueryState] = useDatagridQueryState(
    "users",
    {
      q: "",
      roles: [] as string[],
      status: "ALL" as StatusFilter,
      createdRange: undefined as { from?: string; to?: string } | undefined,
      updatedRange: undefined as { from?: string; to?: string } | undefined,
      cols: Array.from(allColumnIds) as ColId[],
    },
    { persistKey: "users" },
  );

  // 役割（見做し：空配列＝すべて）
  const allRoleCodes = React.useMemo(
    () => roleOptions.map((o) => o.value),
    [roleOptions],
  );
  const rolesForFilter = queryState.roles.length
    ? queryState.roles
    : allRoleCodes;

  // 日付レンジ（URL⇄UI）
  const createdRange = React.useMemo(
    () => toDateRange(queryState.createdRange),
    [queryState.createdRange],
  );
  const updatedRange = React.useMemo(
    () => toDateRange(queryState.updatedRange),
    [queryState.updatedRange],
  );

  const setQ = (v: string) => setQueryState((s) => ({ ...s, q: v }));
  const setRoles = (next: string[]) =>
    setQueryState((s) => ({ ...s, roles: next }));
  const setStatus = (next: StatusFilter) =>
    setQueryState((s) => ({ ...s, status: next }));
  const setCreatedRange = (r?: DateRange) =>
    setQueryState((s) => ({ ...s, createdRange: fromDateRange(r) }));
  const setUpdatedRange = (r?: DateRange) =>
    setQueryState((s) => ({ ...s, updatedRange: fromDateRange(r) }));
  const setVisibleColumnIds = (ids: ColId[]) =>
    setQueryState((s) => ({ ...s, cols: ids }));

  // ページサイズだけLS
  const [persisted, setPersisted] = usePersistentDatagridState("users", {
    pageSize: 20,
  });

  // 並び順（ローカル）
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "createdAt", desc: true },
  ]);

  // 列ラベル
  const columnLabels = React.useMemo(
    () =>
      ({
        displayId: "表示ID",
        name: "氏名",
        email: "メール",
        roleCode: "ロール",
        isActive: "状態",
        phone: "電話番号",
        remarks: "備考",
        createdAt: "登録日時",
        updatedAt: "更新日時",
      }) as const,
    [],
  );

  // 可視列
  const effectiveVisibleColumnIds: ColId[] = mounted
    ? (queryState.cols as ColId[])
    : (Array.from(allColumnIds) as ColId[]);
  const columnVisibility = React.useMemo<VisibilityState>(() => {
    const set = new Set(effectiveVisibleColumnIds);
    return {
      actions: true,
      q: false,
      displayId: set.has("displayId"),
      name: set.has("name"),
      email: set.has("email"),
      roleCode: set.has("roleCode"),
      isActive: set.has("isActive"),
      phone: set.has("phone"),
      remarks: set.has("remarks"),
      createdAt: set.has("createdAt"),
      updatedAt: set.has("updatedAt"),
    };
  }, [effectiveVisibleColumnIds]);

  // フィルタ
  const filteredData = React.useMemo(() => {
    const needle = queryState.q.trim().toLowerCase();
    const roleSet = new Set(rolesForFilter);
    const inRange = (d: Date, r?: DateRange) => {
      if (!r?.from && !r?.to) return true;
      const ts = d.getTime();
      if (r?.from && ts < new Date(r.from).setHours(0, 0, 0, 0)) return false;
      if (r?.to && ts > new Date(r.to).setHours(23, 59, 59, 999)) return false;
      return true;
    };

    return data.filter((u) => {
      const passQ =
        !needle ||
        `${u.displayId} ${u.name} ${u.email} ${u.phone ?? ""} ${u.remarks ?? ""}`
          .toLowerCase()
          .includes(needle);
      const passRole = roleSet.has(u.roleCode);
      const passStatus =
        queryState.status === "ALL" ||
        (queryState.status === "ACTIVE" ? u.isActive : !u.isActive);
      const passCreated = inRange(u.createdAt, createdRange);
      const passUpdated = inRange(u.updatedAt, updatedRange);
      return passQ && passRole && passStatus && passCreated && passUpdated;
    });
  }, [
    data,
    queryState.q,
    queryState.status,
    rolesForFilter,
    createdRange,
    updatedRange,
  ]);

  // テーブル
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
      roleOptions,
      roles: rolesForFilter,
      setRoles,
      status: queryState.status,
      setStatus,
      createdRange,
      setCreatedRange,
      updatedRange,
      setUpdatedRange,
    },
  });

  // mount後にLSのpageSizeを反映
  React.useEffect(() => {
    if (mounted) table.setPageSize(persisted.pageSize);
  }, [mounted, persisted.pageSize, table]);

  // CSV 出力（可視列のみ）
  const onDownloadCsv = React.useCallback(() => {
    const visibleLeaf = table
      .getVisibleLeafColumns()
      .map((c) => c.id)
      .filter((id) => id !== "actions" && id !== "q") as ColId[];

    const headers = visibleLeaf.map((id) => columnLabels[id]);

    const rows = filteredData.map((u) =>
      visibleLeaf.map((id) => {
        switch (id) {
          case "displayId":
            return u.displayId;
          case "name":
            return u.name;
          case "email":
            return u.email;
          case "roleCode":
            return u.roleName ?? u.roleCode;
          case "isActive":
            return u.isActive ? "有効" : "無効";
          case "phone":
            return u.phone ?? "";
          case "remarks":
            return u.remarks ?? "";
          case "createdAt":
            return fmtDateTime(u.createdAt);
          case "updatedAt":
            return fmtDateTime(u.updatedAt);
          default:
            return "";
        }
      }),
    );

    const csv = buildCsv(headers, rows);
    const ts = format(new Date(), "yyyyMMdd_HHmmss", { locale: ja });
    downloadCsv(`users_${ts}.csv`, csv);
  }, [filteredData, table, columnLabels]);

  // サマリー用テキスト
  const roleLabel =
    queryState.roles.length === 0
      ? "ロール: すべて"
      : `ロール: ${queryState.roles
          .map(
            (v) =>
              new Map(roleOptions.map((o) => [o.value, o.label])).get(v) ?? v,
          )
          .join(", ")}`;
  const statusText =
    queryState.status === "ALL"
      ? "状態: すべて"
      : queryState.status === "ACTIVE"
        ? "状態: 有効"
        : "状態: 無効";
  const visibleColsText = effectiveVisibleColumnIds
    .map((id) => columnLabels[id])
    .join(", ");

  const filteredCount = filteredData.length;

  // 画面
  return (
    <div className="space-y-3">
      <DatagridToolbar<ColId>
        qTitle={`${columnLabels.displayId}/${columnLabels.name}/${columnLabels.email}/${columnLabels.phone}/${columnLabels.remarks}`}
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
        newHref="/users/new"
      />

      {/* 件数・サマリ・全解除 */}
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm" data-testid="count">
          表示件数： {filteredCount} 件
        </div>
        <div className="flex max-w-[60%] items-center justify-end gap-2">
          <DatagridSummary
            mounted={mounted}
            roleText={roleLabel}
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
                roles: [],
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

      {/* テーブル */}
      <div className="overflow-x-auto rounded-md border pb-1">
        <Table
          className="w-full"
          data-testid="users-table"
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
                  data-testid={`row-${(row.original as UserRow).displayId}`}
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
                  条件に一致するユーザが見つかりませんでした。
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <DatagridPagination<UserRow>
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
