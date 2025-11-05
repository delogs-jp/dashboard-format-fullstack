// src/components/datagrid/datagrid-toolbar.tsx
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { Columns3, FileDown } from "lucide-react";
import Link from "next/link";
import {
  ColumnsChecklist,
  type ColumnOption,
} from "@/components/filters/columns-checklist";

type Props<ColId extends string> = {
  q: string;
  qTitle?: string;
  onChangeQ: (v: string) => void;
  columnOptions: ColumnOption[];
  visibleColumnIds: ColId[];
  onChangeVisibleColumns: (ids: ColId[]) => void;
  canDownloadData?: boolean;
  onDownloadCsv?: () => void;
  canEditData?: boolean;
  newHref?: string;
};

export function DatagridToolbar<ColId extends string>({
  q,
  qTitle,
  onChangeQ,
  columnOptions,
  visibleColumnIds,
  onChangeVisibleColumns,
  canDownloadData,
  onDownloadCsv,
  canEditData,
  newHref,
}: Props<ColId>) {
  return (
    <div className="md: flex flex-wrap items-center justify-between gap-3 md:flex-nowrap">
      <Input
        name="filter-q"
        value={q}
        onChange={(e) => onChangeQ(e.target.value)}
        placeholder={qTitle ? `検索：${qTitle}` : "キーワードで検索"}
        className="w-[270px] basis-full text-sm md:basis-auto"
        aria-label="検索キーワード"
      />
      <div className="ml-auto flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="cursor-pointer"
              title="表示項目の変更"
            >
              <Columns3 className="h-4 w-4" />
              表示項目
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-[320px] p-0">
            <ColumnsChecklist
              value={visibleColumnIds}
              onChange={(ids) => onChangeVisibleColumns(ids as ColId[])}
              options={columnOptions}
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

        {canDownloadData && onDownloadCsv && (
          <Button
            variant="outline"
            onClick={onDownloadCsv}
            className="cursor-pointer"
          >
            <FileDown className="h-4 w-4" />
            CSV
          </Button>
        )}

        {canEditData && newHref && (
          <Button asChild>
            <Link href={newHref}>新規登録</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
