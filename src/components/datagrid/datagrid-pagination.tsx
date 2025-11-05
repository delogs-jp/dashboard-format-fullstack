// src/components/datagrid/datagrid-pagination.tsx
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import type { Table } from "@tanstack/react-table";

type Props<TData> = {
  table: Table<TData>;
  pageSize: number;
  onChangePageSize: (n: number) => void;
};

export function DatagridPagination<TData>({
  table,
  pageSize,
  onChangePageSize,
}: Props<TData>) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">1ページの表示件数</span>
        <Select
          value={String(pageSize)}
          onValueChange={(v) => onChangePageSize(Number(v))}
          name="page-size"
        >
          <SelectTrigger className="w-[88px]">
            <SelectValue placeholder="件数" />
          </SelectTrigger>
          <SelectContent>
            {[20, 50, 100].map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n} 件
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-sm">
          Page {table.getState().pagination.pageIndex + 1} /{" "}
          {table.getPageCount() || 1}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
          className="cursor-pointer"
        >
          前へ
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
          className="cursor-pointer"
        >
          次へ
        </Button>
      </div>
    </div>
  );
}
