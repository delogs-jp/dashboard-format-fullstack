// src/components/datagrid/sort-button.tsx
"use client";

import * as React from "react";
import type { Column } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";

type Props<TData, TValue> = {
  column: Column<TData, TValue>;
  "aria-label"?: string;
  title?: string;
};

export function SortButton<TData, TValue>({
  column,
  ...rest
}: Props<TData, TValue>) {
  const state = column.getIsSorted(); // false | 'asc' | 'desc'
  const active = state === "asc" || state === "desc";

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Shift / Ctrl / ⌘ 押下なら「複数ソート」モード
    const multi = e.shiftKey || e.ctrlKey || e.metaKey;

    const s = column.getIsSorted();
    if (!s) {
      // none -> desc
      column.toggleSorting(true, multi);
    } else if (s === "desc") {
      // desc -> asc
      column.toggleSorting(false, multi);
    } else {
      // asc -> none（この列だけ解除。他列は保持される）
      column.clearSorting();
    }
  };

  const hint =
    (rest.title ?? "") + (rest.title ? " / " : "") + "Shift/Ctrl/⌘で複数ソート";

  return (
    <Button
      type="button"
      size="icon"
      variant={active ? "default" : "outline"}
      className="h-7 w-7 cursor-pointer"
      onClick={handleClick}
      title={hint}
      {...rest}
    >
      {state === "desc" ? (
        <ChevronDown className="h-3.5 w-3.5" />
      ) : state === "asc" ? (
        <ChevronUp className="h-3.5 w-3.5" />
      ) : (
        <ChevronsUpDown className="h-3.5 w-3.5" />
      )}
    </Button>
  );
}
