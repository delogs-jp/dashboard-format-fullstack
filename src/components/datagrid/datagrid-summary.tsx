// src/components/datagrid/datagrid-summary.tsx
"use client";

import * as React from "react";
import type { DateRange } from "react-day-picker";
import { fmtRangeLocal, fmtRangeStable } from "@/lib/datagrid/date-io";

type Props = {
  mounted: boolean;
  roleText?: string; // 例: "ロール: すべて" or "ロール: 管理者, 閲覧者"
  statusText: string; // 例: "状態: すべて"
  createdTitle?: string; // 例: "登録"
  updatedTitle?: string; // 例: "更新"
  createdRangeISO?: { from?: string; to?: string };
  updatedRangeISO?: { from?: string; to?: string };
  createdRange?: DateRange; // mounted=true のときローカル表示に利用
  updatedRange?: DateRange; // 同上
  visibleColsText: string; // "表示ID, 氏名, ..."
};

export function DatagridSummary({
  mounted,
  roleText,
  statusText,
  createdTitle,
  updatedTitle,
  createdRangeISO,
  updatedRangeISO,
  createdRange,
  updatedRange,
  visibleColsText,
}: Props) {
  // タイトルがあるときだけ算出（無駄計算を避ける）
  const createdText = React.useMemo(
    () =>
      createdTitle
        ? mounted
          ? fmtRangeLocal(createdRange)
          : fmtRangeStable(createdRangeISO)
        : undefined,
    [createdTitle, mounted, createdRange, createdRangeISO],
  );

  const updatedText = React.useMemo(
    () =>
      updatedTitle
        ? mounted
          ? fmtRangeLocal(updatedRange)
          : fmtRangeStable(updatedRangeISO)
        : undefined,
    [updatedTitle, mounted, updatedRange, updatedRangeISO],
  );

  const parts = [
    roleText,
    statusText,
    createdTitle && createdText ? `${createdTitle}: ${createdText}` : undefined,
    updatedTitle && updatedText ? `${updatedTitle}: ${updatedText}` : undefined,
    `表示: ${visibleColsText}`,
  ];
  const summary = parts.filter(Boolean).join(" / ");

  return (
    <div
      className="text-muted-foreground truncate text-right text-xs"
      title={summary}
    >
      {summary}
    </div>
  );
}
