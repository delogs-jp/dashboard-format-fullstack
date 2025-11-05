// src/app/(protected)/users/password-request/data-table.tsx
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
import { toast } from "sonner";

import type { PasswordRequestRow } from "./columns";
import type { RoleOption } from "@/components/filters/roles-checklist";
import { type PwReqStatus, PW_STATUS_LABEL } from "./status-multi-select";
import {
  issuePasswordRequestAction,
  rejectPasswordRequestAction,
} from "@/app/_actions/users/password-requests";

// 共通フック＆ユーティリティ
import { useDatagridQueryState } from "@/lib/datagrid/use-datagrid-query-state";
import { usePersistentDatagridState } from "@/lib/datagrid/use-persistent-datagrid-state";
import { fromDateRange, toDateRange } from "@/lib/datagrid/date-io";
import { buildCsv, downloadCsv, fmtDateTime } from "@/lib/datagrid/csv";

// UI 部品
import { DatagridToolbar } from "@/components/datagrid/datagrid-toolbar";
import { DatagridSummary } from "@/components/datagrid/datagrid-summary";
import { DatagridPagination } from "@/components/datagrid/datagrid-pagination";

type Props = {
  columns: ColumnDef<PasswordRequestRow, unknown>[];
  data: PasswordRequestRow[];
  roleOptions: RoleOption[];
  //  statusOptions: { value: PwReqStatus; label: string }[];
  canDownloadData?: boolean;
};

export default function DataTable({
  columns,
  data,
  roleOptions,
  //  statusOptions,
  canDownloadData = false,
}: Props) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  // 列ID（actions / q 除外）
  const allColumnIds = React.useMemo(
    () =>
      [
        "requestedAt",
        "userId",
        "userName",
        "email",
        "note",
        "roleCode",
        "status",
        "processedAt",
        "processedBy",
      ] as const,
    [],
  );
  type ColId = (typeof allColumnIds)[number];

  // URL同期（statuses は空配列＝すべて）
  const [queryState, setQueryState] = useDatagridQueryState(
    "password-reqs",
    {
      q: "",
      roles: [] as string[],
      statuses: [] as PwReqStatus[],
      requestedRange: undefined as { from?: string; to?: string } | undefined,
      processedRange: undefined as { from?: string; to?: string } | undefined,
      cols: Array.from(allColumnIds) as ColId[],
    },
    { persistKey: "password-reqs" },
  );

  // ページサイズだけLS（デフォルト20件）
  const [persisted, setPersisted] = usePersistentDatagridState("pw-reqs", {
    pageSize: 20,
  });

  // 並び順（ローカル）
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "requestedAt", desc: true },
  ]);

  // 行（UI即時反映用）
  const [localRows, setLocalRows] = React.useState<PasswordRequestRow[]>(
    () => data,
  );
  React.useEffect(() => setLocalRows(data), [data]);

  // ロール（空配列＝すべて）
  const allRoleCodes = React.useMemo(
    () => roleOptions.map((o) => o.value),
    [roleOptions],
  );
  const rolesForFilter = queryState.roles.length
    ? queryState.roles
    : allRoleCodes;

  // 状態
  const pwStatusOptions = React.useMemo(
    () =>
      Array.from(new Set(localRows.map((r) => r.status))).map((s) => ({
        value: s as PwReqStatus,
        label: PW_STATUS_LABEL[s as PwReqStatus],
      })),
    [localRows],
  );
  // ↓これを pwStatusOptions から作る（空配列＝すべて）
  const allStatusCodes = React.useMemo(
    () => pwStatusOptions.map((o) => o.value),
    [pwStatusOptions],
  );
  const statusesForFilter = queryState.statuses.length
    ? queryState.statuses
    : allStatusCodes;
  // 日付レンジ
  const requestedRange = React.useMemo(
    () => toDateRange(queryState.requestedRange),
    [queryState.requestedRange],
  );
  const processedRange = React.useMemo(
    () => toDateRange(queryState.processedRange),
    [queryState.processedRange],
  );

  // setter 群
  const setQ = (v: string) => setQueryState((s) => ({ ...s, q: v }));
  const setRoles = (next: string[]) =>
    setQueryState((s) => ({ ...s, roles: next }));
  const setPwStatuses = (next: PwReqStatus[]) =>
    setQueryState((s) => ({ ...s, statuses: next }));
  const setRequestedRange = (r?: DateRange) =>
    setQueryState((s) => ({ ...s, requestedRange: fromDateRange(r) }));
  const setProcessedRange = (r?: DateRange) =>
    setQueryState((s) => ({ ...s, processedRange: fromDateRange(r) }));
  const setVisibleColumnIds = (ids: ColId[]) =>
    setQueryState((s) => ({ ...s, cols: ids }));

  // 操作（UIのみ／サーバアクション差し替え前提）
  const onIssue = React.useCallback(
    async (id: string) => {
      const fd = new FormData();
      fd.append("id", id);

      try {
        const res = await issuePasswordRequestAction(fd);
        if (!res.ok) {
          toast.error(res.message || "再発行に失敗しました。");
          return;
        }

        // ローカル行更新（即時反映）
        setLocalRows((prev) =>
          prev.map((r) =>
            r.id === id
              ? {
                  ...r,
                  status: "ISSUED",
                  processedAt: new Date(),
                  processedBy: "(you)",
                }
              : r,
          ),
        );
        toast.success("パスワードを再発行し、通知メールを送信しました。");
      } catch (e) {
        console.error("[password-req] issue failed:", e);
        toast.error("サーバーエラーが発生しました。");
      }
    },
    [setLocalRows],
  );

  const onReject = React.useCallback(
    async (id: string) => {
      const fd = new FormData();
      fd.append("id", id);

      try {
        const res = await rejectPasswordRequestAction(fd);
        if (!res.ok) {
          toast.error(res.message || "拒否に失敗しました。");
          return;
        }

        setLocalRows((prev) =>
          prev.map((r) =>
            r.id === id
              ? {
                  ...r,
                  status: "REJECTED",
                  processedAt: new Date(),
                  processedBy: "(you)",
                }
              : r,
          ),
        );
        toast.message("依頼を拒否しました。");
      } catch (e) {
        console.error("[password-req] reject failed:", e);
        toast.error("サーバーエラーが発生しました。");
      }
    },
    [setLocalRows],
  );

  // 可視列（SSR一致のため mount 後にURLの列を採用）
  const effectiveVisibleColumnIds: ColId[] = mounted
    ? (queryState.cols as ColId[])
    : (Array.from(allColumnIds) as ColId[]);
  const columnVisibility = React.useMemo<VisibilityState>(() => {
    const set = new Set(effectiveVisibleColumnIds);
    return Object.fromEntries(
      (["actions", "q", ...allColumnIds] as const).map((id) => [
        id,
        id === "actions" ? true : set.has(id as ColId),
      ]),
    ) as VisibilityState;
  }, [effectiveVisibleColumnIds, allColumnIds]);

  // フィルタ
  const filteredData = React.useMemo(() => {
    const needle = queryState.q.trim().toLowerCase();
    const roleSet = new Set(rolesForFilter);
    const statusSet = new Set(statusesForFilter);
    const inRange = (d?: Date | null, r?: DateRange) => {
      if (!d) return false;
      if (!r?.from && !r?.to) return true;
      const ts = d.getTime();
      if (r?.from && ts < new Date(r.from).setHours(0, 0, 0, 0)) return false;
      if (r?.to && ts > new Date(r.to).setHours(23, 59, 59, 999)) return false;
      return true;
    };

    return localRows.filter((r) => {
      const passQ =
        !needle ||
        `${r.userId} ${r.email} ${r.userName} ${r.processedBy ?? ""}  ${r.note ?? ""}`
          .toLowerCase()
          .includes(needle);
      const passRole = r.roleCode
        ? roleSet.has(r.roleCode)
        : roleSet.size === rolesForFilter.length;
      const passStatus = statusSet.has(r.status);
      const passRequested = inRange(r.requestedAt, requestedRange);
      const passProcessed = r.processedAt
        ? inRange(r.processedAt, processedRange)
        : !processedRange?.from && !processedRange?.to;
      return passQ && passRole && passStatus && passRequested && passProcessed;
    });
  }, [
    localRows,
    queryState.q,
    rolesForFilter,
    statusesForFilter,
    requestedRange,
    processedRange,
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
      onIssue,
      onReject,
      // フィルタUIが読むメタ
      roleOptions,
      roles: rolesForFilter,
      setRoles,
      pwStatusOptions, // ← 修正
      pwStatuses: queryState.statuses,
      setPwStatuses,
      requestedRange,
      setRequestedRange,
      processedRange,
      setProcessedRange,
    },
  });

  // mount後にLSのpageSizeを反映
  React.useEffect(() => {
    if (mounted) table.setPageSize(persisted.pageSize);
  }, [mounted, persisted.pageSize, table]);

  // CSV（可視列のみ）
  const columnLabels = React.useMemo(
    () =>
      ({
        requestedAt: "依頼日時",
        userId: "ユーザID",
        userName: "ユーザ名",
        email: "メール",
        note: "備考",
        roleCode: "ロール",
        status: "状態",
        processedAt: "処理日時",
        processedBy: "処理者",
      }) as const,
    [],
  ); // ◀ 依存配列を空 [] にする

  const onDownloadCsv = React.useCallback(() => {
    const visibleLeaf = table
      .getVisibleLeafColumns()
      .map((c) => c.id)
      .filter((id) => id !== "actions" && id !== "q") as ColId[];

    const headers = visibleLeaf.map((id) => columnLabels[id]);

    const rows = filteredData.map((r) =>
      visibleLeaf.map((id) => {
        switch (id) {
          case "requestedAt":
            return fmtDateTime(r.requestedAt);
          case "userId":
            return r.userId;
          case "userName":
            return r.userName;
          case "email":
            return r.email;
          case "note":
            return r.note ?? "";
          case "roleCode":
            return r.roleName ?? r.roleCode;
          case "status":
            return r.status === "PENDING"
              ? "未処理"
              : r.status === "ISSUED"
                ? "再発行済"
                : "拒否";
          case "processedAt":
            return r.processedAt ? fmtDateTime(r.processedAt) : "";
          case "processedBy":
            return r.processedBy ?? "";
          default:
            return "";
        }
      }),
    );

    const csv = buildCsv(headers, rows);
    const ts = format(new Date(), "yyyyMMdd_HHmmss", { locale: ja });
    downloadCsv(`password_requests_${ts}.csv`, csv);
  }, [filteredData, table, columnLabels]);

  const filteredCount = filteredData.length;
  const visibleColsText = (mounted ? effectiveVisibleColumnIds : allColumnIds)
    .map((id) => columnLabels[id])
    .join(", ");

  const roleText =
    queryState.roles.length === 0
      ? "ロール: すべて"
      : `ロール: ${queryState.roles
          .map(
            (v) =>
              new Map(roleOptions.map((o) => [o.value, o.label])).get(v) ?? v,
          )
          .join(", ")}`;

  const statusText =
    queryState.statuses.length === 0
      ? "状態: すべて"
      : `状態: ${queryState.statuses
          .map((s) => pwStatusOptions.find((o) => o.value === s)?.label ?? s)
          .join(", ")}`;

  return (
    <div className="space-y-3">
      <DatagridToolbar<ColId>
        qTitle={`${columnLabels.userId}/${columnLabels.userName}/${columnLabels.email}/${columnLabels.processedBy}/${columnLabels.note}`}
        q={queryState.q}
        onChangeQ={setQ}
        columnOptions={allColumnIds.map((id) => ({
          value: id,
          label: columnLabels[id],
        }))}
        visibleColumnIds={
          mounted
            ? (queryState.cols as ColId[])
            : (Array.from(allColumnIds) as ColId[])
        }
        onChangeVisibleColumns={setVisibleColumnIds}
        canDownloadData={canDownloadData}
        onDownloadCsv={onDownloadCsv}
      />

      {/* 件数・サマリ・全解除 */}
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm" data-testid="count">
          表示件数： {filteredCount} 件
        </div>
        <div className="flex max-w-[60%] items-center justify-end gap-2">
          <DatagridSummary
            mounted={mounted}
            roleText={roleText}
            statusText={statusText}
            createdTitle="依頼"
            updatedTitle="処理"
            createdRangeISO={queryState.requestedRange}
            updatedRangeISO={queryState.processedRange}
            createdRange={requestedRange}
            updatedRange={processedRange}
            visibleColsText={visibleColsText}
          />
          <button
            type="button"
            className="text-muted-foreground shrink-0 cursor-pointer text-xs underline"
            title="全フィルタ解除"
            onClick={() => {
              setQueryState((s) => ({
                ...s,
                q: "",
                roles: [],
                statuses: [],
                requestedRange: undefined,
                processedRange: undefined,
                cols: Array.from(allColumnIds) as ColId[],
              }));
              setPersisted((p) => ({ ...p, pageSize: 20 }));
              table.setPageSize(20);
            }}
          >
            全フィルタ解除
          </button>
        </div>
      </div>

      {/* テーブル */}
      <div className="overflow-x-auto rounded-md border pb-1">
        <Table className="w-full" data-testid="pw-requests-table">
          <TableHeader className="bg-muted/60 sticky top-0 z-20 text-xs backdrop-blur">
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
                <TableRow key={row.id} data-testid={`row-${row.original.id}`}>
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
                  条件に一致する依頼が見つかりませんでした。
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <DatagridPagination<PasswordRequestRow>
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
