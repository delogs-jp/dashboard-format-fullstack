// src/lib/datagrid/csv.ts
import { format } from "date-fns";
import { ja } from "date-fns/locale";

export type CsvRowObject = Record<string, string | number>;

export function buildCsv(
  headers: string[],
  rows: (string | number)[][],
): string {
  const quote = (s: string | number) =>
    `"${String(s).replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;
  return [headers, ...rows].map((r) => r.map(quote).join(",")).join("\r\n");
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export const fmtDateTime = (d: Date) =>
  format(d, "yyyy/MM/dd HH:mm", { locale: ja });
