// src/lib/datagrid/date-io.ts
import type { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

export type StrDateRange = { from?: string; to?: string } | undefined;

export const toDateRange = (src: StrDateRange): DateRange | undefined =>
  src
    ? {
        from: src.from ? new Date(src.from) : undefined,
        to: src.to ? new Date(src.to) : undefined,
      }
    : undefined;

export const fromDateRange = (r?: DateRange): StrDateRange =>
  r ? { from: r.from?.toISOString(), to: r.to?.toISOString() } : undefined;

// サマリ用：SSR中は ISO(yyyy-MM-dd) で安定、CSR後はローカル表示に切替
export const fmtIsoDay = (iso?: string) => (iso ? iso.slice(0, 10) : "");
export const fmtRangeStable = (r?: { from?: string; to?: string }) =>
  r?.from || r?.to ? `${fmtIsoDay(r?.from)}-${fmtIsoDay(r?.to)}` : "すべて";

export const fmtDayLocal = (d?: Date) =>
  d ? format(d, "yyyy-MM-dd", { locale: ja }) : "";
export const fmtRangeLocal = (r?: DateRange) =>
  r?.from || r?.to ? `${fmtDayLocal(r?.from)}-${fmtDayLocal(r?.to)}` : "すべて";
