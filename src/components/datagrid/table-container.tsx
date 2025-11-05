// src/components/datagrid/table-container.tsx
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * テーブル用スクロールコンテナ（縦横スクロール・固定ヘッダー用）
 * - shadcn/ui の Table は使わず、<table> を直に包む
 * - shadcn の TableHeader / TableHead / TableRow / TableCell はそのまま使える
 */

type TableProps = React.ComponentProps<"table"> & {
  /** ← 追加：外側のラッパ(div)に当てたいクラス */
  containerClassName?: string;
};

export function Table({ className, containerClassName, ...props }: TableProps) {
  return (
    <div
      data-slot="table-container"
      className={cn("relative w-full overflow-x-auto", containerClassName)}
    >
      <table
        data-slot="table"
        className={cn("w-full caption-bottom text-sm", className)}
        {...props}
      />
    </div>
  );
}
