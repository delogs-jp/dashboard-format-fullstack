// src/app/(protected)/users/email-change-requests/data-table.tsx
"use client";

import * as React from "react";
import type {
  ColumnDef,
  SortingState,
  VisibilityState,
} from "@tanstack/react-table";
import {
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  flexRender,
} from "@tanstack/react-table";
import { Table } from "@/components/datagrid/table-container";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import type { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { DatagridToolbar } from "@/components/datagrid/datagrid-toolbar";
import { DatagridSummary } from "@/components/datagrid/datagrid-summary";
import { DatagridPagination } from "@/components/datagrid/datagrid-pagination";
import { useDatagridQueryState } from "@/lib/datagrid/use-datagrid-query-state";
import { usePersistentDatagridState } from "@/lib/datagrid/use-persistent-datagrid-state";
import { fromDateRange, toDateRange } from "@/lib/datagrid/date-io";
import { buildCsv, downloadCsv, fmtDateTime } from "@/lib/datagrid/csv";
import type { RoleOption } from "@/components/filters/roles-checklist";
import {
  approveEmailChangeRequestAction,
  rejectEmailChangeRequestAction,
} from "@/app/_actions/users/email-change-requests";
import { STATUS_LABEL, type ReqStatus } from "./status-multi-select";

export type EmailChangeRow = {
  id: string;
  requestedAt: Date;
  verifiedAt?: Date | null;
  processedAt?: Date | null;
  processedBy?: string | null;
  accountId: string;
  userName: string;
  oldEmail: string; // ASCII
  newEmail: string; // ASCII
  status: ReqStatus;
  // ★ 追加：ロール表示
  roleCode: string;
  roleName: string;
  roleBadgeColor: string | null;
};

type Props = {
  columns: ColumnDef<EmailChangeRow, unknown>[];
  data: EmailChangeRow[];
  roleOptions: RoleOption[];
  canDownloadData?: boolean;
  statusOptions: { value: ReqStatus; label: string }[];
};

const statusToLabel = (s: ReqStatus) => STATUS_LABEL[s] ?? s;

export default function DataTable({
  columns,
  data,
  roleOptions,
  canDownloadData = false,
  statusOptions,
}: Props) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  // 列ID（actions / q 除外）
  const allColumnIds = React.useMemo(
    () =>
      [
        "requestedAt",
        "accountId",
        "userName",
        "roleCode",
        "oldEmail",
        "newEmail",
        "status",
        "processedAt",
        "processedBy",
      ] as const,
    [],
  );
  type ColId = (typeof allColumnIds)[number];

  // URL同期（メール申請一覧用のネームスペース）
  const [queryState, setQueryState] = useDatagridQueryState(
    "email-reqs",
    {
      q: "",
      roles: [] as string[], // 空＝すべて
      statuses: [] as ReqStatus[], // 空＝すべて
      requestedRange: undefined as { from?: string; to?: string } | undefined,
      processedRange: undefined as { from?: string; to?: string } | undefined,
      cols: Array.from(allColumnIds) as ColId[],
    },
    { persistKey: "email-reqs" },
  );

  // ページサイズは localStorage
  const [persisted, setPersisted] = usePersistentDatagridState("email-reqs", {
    pageSize: 20,
  });

  // 並び順
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "requestedAt", desc: true },
  ]);

  // 役割（空配列＝すべて）
  const allRoleCodes = React.useMemo(
    () => roleOptions.map((o) => o.value),
    [roleOptions],
  );
  const rolesForFilter = queryState.roles.length
    ? queryState.roles
    : allRoleCodes;

  // 状態（空配列＝すべて）
  const allStatusCodes = React.useMemo(
    () => statusOptions.map((o) => o.value),
    [statusOptions],
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
  const setStatuses = (next: ReqStatus[]) =>
    setQueryState((s) => ({ ...s, statuses: next }));
  const setRequestedRange = (r?: DateRange) =>
    setQueryState((s) => ({ ...s, requestedRange: fromDateRange(r) }));
  const setProcessedRange = (r?: DateRange) =>
    setQueryState((s) => ({ ...s, processedRange: fromDateRange(r) }));
  const setVisibleColumnIds = (ids: ColId[]) =>
    setQueryState((s) => ({ ...s, cols: ids }));

  // ローカル行（承認/却下後に更新）
  const [localRows, setLocalRows] = React.useState<EmailChangeRow[]>(
    () => data,
  );
  React.useEffect(() => setLocalRows(data), [data]);

  // 承認
  const onApprove = React.useCallback(
    async (id: string) => {
      const fd = new FormData();
      fd.set("id", id);
      const res = await approveEmailChangeRequestAction(fd);
      if (!res.ok) {
        toast.error(res.message ?? "承認に失敗しました");
        return;
      }
      // ローカル即時反映
      setLocalRows((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                status: "APPROVED",
                processedAt: new Date(),
                processedBy: "(you)",
              }
            : r,
        ),
      );
      toast.success("申請を承認しました");
    },
    [setLocalRows],
  );

  // 却下
  const onReject = React.useCallback(
    async (id: string) => {
      const fd = new FormData();
      fd.set("id", id);
      const res = await rejectEmailChangeRequestAction(fd);
      if (!res.ok) {
        toast.error(res.message ?? "却下に失敗しました");
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
      toast.message("申請を却下しました");
    },
    [setLocalRows],
  );
  // 列可視（初回SSR一致のためマウント後に反映）
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
  // フィルタ（ローカル）
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
        `${r.accountId} ${r.userName} ${r.oldEmail} ${r.newEmail}`
          .toLowerCase()
          .includes(needle);
      const passRole = roleSet.has(r.roleCode);
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
      onApprove,
      onReject,
      // フィルタUIが読むメタ
      roleOptions,
      roles: rolesForFilter,
      setRoles,
      statusOptions,
      statuses: queryState.statuses,
      setStatuses,
      requestedRange,
      setRequestedRange,
      processedRange,
      setProcessedRange,
    },
  });

  React.useEffect(() => {
    if (mounted) table.setPageSize(persisted.pageSize);
  }, [mounted, persisted.pageSize, table]);

  // CSV（可視列のみ）
  const columnLabels = React.useMemo(
    () =>
      ({
        requestedAt: "申請日時",
        accountId: "アカウントID",
        userName: "ユーザ名",
        roleCode: "ロール",
        oldEmail: "旧メール",
        newEmail: "新メール",
        status: "状態",
        processedAt: "処理日時",
        processedBy: "処理者",
      }) as const,
    [],
  );
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
          case "accountId":
            return r.accountId;
          case "userName":
            return r.userName;
          case "roleCode":
            return r.roleName || r.roleCode;
          case "oldEmail":
            return r.oldEmail;
          case "newEmail":
            return r.newEmail;
          case "status":
            return statusToLabel(r.status);
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
    downloadCsv(`email_change_requests_${ts}.csv`, csv);
  }, [filteredData, table, columnLabels]);

  const filteredCount = filteredData.length;

  // 画面：ユーザ一覧の薄型版に揃える
  return (
    <div className="space-y-3">
      <DatagridToolbar<ColId>
        qTitle={`${columnLabels.accountId}/${columnLabels.userName}/${columnLabels.oldEmail}/${columnLabels.newEmail}`}
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
      />

      <div className="flex items-center justify-between gap-3">
        <div className="text-sm" data-testid="count">
          表示件数： {filteredCount} 件
        </div>
        {/* サマリ + 全フィルタ解除 */}
        <div className="flex max-w-[60%] items-center justify-end gap-2">
          <DatagridSummary
            mounted={mounted}
            roleText={
              queryState.roles.length === 0
                ? "ロール: すべて"
                : `ロール: ${queryState.roles
                    .map(
                      (v) =>
                        new Map(roleOptions.map((o) => [o.value, o.label])).get(
                          v,
                        ) ?? v,
                    )
                    .join(", ")}`
            }
            statusText={
              queryState.statuses.length === 0
                ? "状態: すべて"
                : `状態: ${queryState.statuses.map(statusToLabel).join(", ")}`
            }
            createdTitle="申請"
            updatedTitle="処理"
            createdRangeISO={queryState.requestedRange}
            updatedRangeISO={queryState.processedRange}
            createdRange={requestedRange}
            updatedRange={processedRange}
            visibleColsText={effectiveVisibleColumnIds
              .map((id) => columnLabels[id])
              .join(", ")}
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

      <div className="overflow-x-auto rounded-md border pb-1">
        <Table className="w-full" data-testid="email-change-table">
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
                  条件に一致する申請が見つかりませんでした。
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <DatagridPagination<EmailChangeRow>
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
