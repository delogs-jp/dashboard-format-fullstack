// src/app/(protected)/users/email-change-requests/status-multi-select.tsx
"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandInput,
  CommandEmpty,
} from "@/components/ui/command";
import { Separator } from "@/components/ui/separator";

export type ReqStatus =
  | "PENDING"
  | "VERIFIED"
  | "APPROVED"
  | "REJECTED"
  | "EXPIRED";

export const STATUS_LABEL: Record<ReqStatus, string> = {
  PENDING: "未認証",
  VERIFIED: "本人確認済",
  APPROVED: "承認済",
  REJECTED: "却下",
  EXPIRED: "期限切れ",
};

export const ALL_STATUSES: ReqStatus[] = [
  "PENDING",
  "VERIFIED",
  "APPROVED",
  "REJECTED",
  "EXPIRED",
];

export function StatusMultiSelect({
  value,
  onChange,
  options,
  footer,
}: {
  /** 選択中。空配列は「すべて」を意味する（URL/状態同期の表現） */
  value: ReqStatus[];
  onChange: (next: ReqStatus[]) => void;
  /** 一覧に“登場した”状態のみ（value/label） */
  options: Array<ReqStatus | { value: ReqStatus; label: string }>;
  footer?: React.ReactNode;
}) {
  // 検索ワード
  const [needle, setNeedle] = React.useState("");

  // ★ options の正規化（"PENDING" | {value:"PENDING",label:"未認証"} どちらでもOKに）
  const normalized = React.useMemo(
    () =>
      options.map((o) =>
        typeof o === "string"
          ? { value: o, label: STATUS_LABEL[o] }
          : { value: o.value, label: o.label ?? STATUS_LABEL[o.value] },
      ),
    [options],
  );
  // 見かけ上の選択集合（空=すべて → 全要素を選択表示）
  const all = React.useMemo(() => normalized.map((o) => o.value), [normalized]);
  const effectiveSelected = React.useMemo<ReqStatus[]>(
    () => (value.length ? value : all),
    [value, all],
  );

  const toggle = (s: ReqStatus) => {
    const set = new Set(effectiveSelected);
    if (set.has(s)) {
      set.delete(s);
    } else {
      set.add(s);
    }
    const next = Array.from(set) as ReqStatus[];
    onChange(next.length === all.length ? [] : next); // 全選択→ [] に畳む
  };

  const allSelected = effectiveSelected.length === all.length;

  // フィルタリング（コード/ラベルの両方を対象に）
  const filtered = React.useMemo(() => {
    const q = needle.trim().toLowerCase();
    if (!q) return normalized;
    return normalized.filter(
      (o) =>
        o.value.toLowerCase().includes(q) || o.label.toLowerCase().includes(q),
    );
  }, [needle, normalized]);

  return (
    <div className="flex max-h-[60vh] w-full flex-col">
      <div className="p-2">
        <Command shouldFilter={false}>
          <CommandInput
            value={needle}
            onValueChange={setNeedle}
            placeholder="状態を検索…"
          />
          <CommandEmpty>該当する状態がありません</CommandEmpty>
          <CommandGroup heading="状態を選択（複数選択可）">
            {filtered.map((o) => {
              const s = o.value;
              const checked = effectiveSelected.includes(s);
              return (
                <CommandItem
                  key={s}
                  onSelect={() => toggle(s)}
                  className="flex items-center gap-2"
                >
                  <span
                    className="flex h-5 w-5 items-center justify-center rounded border"
                    aria-checked={checked}
                    role="checkbox"
                  >
                    {checked ? <Check className="h-3 w-3" /> : null}
                  </span>
                  <span className="truncate">{o.label}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        </Command>
      </div>

      <Separator />

      <div className="flex items-center justify-between gap-2 p-2">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            // “すべて”は空配列にする（＝既存の表現に統一）
            onClick={() => onChange([])}
            disabled={allSelected}
            className="cursor-pointer"
          >
            すべて
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange([])} // 実質“すべて”と同義にして運用簡略化
            className="cursor-pointer"
          >
            クリア
          </Button>
        </div>
        <div className="flex items-center">{footer}</div>
      </div>
    </div>
  );
}
