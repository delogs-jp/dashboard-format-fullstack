// src/app/(protected)/users/password-request/status-multi-select.tsx
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
//import * as PopoverPrimitive from "@radix-ui/react-popover";

export type PwReqStatus = "PENDING" | "ISSUED" | "REJECTED";

export const PW_STATUS_LABEL: Record<PwReqStatus, string> = {
  PENDING: "未処理",
  ISSUED: "再発行済み",
  REJECTED: "拒否",
};

export function StatusMultiSelectPw({
  value,
  onChange,
  options,
  footer,
}: {
  /** 選択中。空配列は「すべて」を意味する（URL/状態同期の表現） */
  value: PwReqStatus[];
  onChange: (next: PwReqStatus[]) => void;
  /** 一覧に登場した状態だけを渡す（value/label） */
  options: Array<PwReqStatus | { value: PwReqStatus; label: string }>;
  footer?: React.ReactNode;
}) {
  const [needle, setNeedle] = React.useState("");

  // options を正規化
  const normalized = React.useMemo(
    () =>
      options.map((o) =>
        typeof o === "string"
          ? { value: o, label: PW_STATUS_LABEL[o] }
          : { value: o.value, label: o.label ?? PW_STATUS_LABEL[o.value] },
      ),
    [options],
  );

  const all = React.useMemo(() => normalized.map((o) => o.value), [normalized]);

  // 空=すべて（UI上は全選択に見せる）
  const effectiveSelected = value.length ? value : all;

  const toggle = (s: PwReqStatus) => {
    const set = new Set(effectiveSelected);
    if (set.has(s)) {
      set.delete(s);
    } else {
      set.add(s);
    }
    const next = Array.from(set) as PwReqStatus[];
    onChange(next.length === all.length ? [] : next); // 全選択→ [] に畳む
  };

  const allSelected = effectiveSelected.length === all.length;

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
              const checked = effectiveSelected.includes(o.value);
              return (
                <CommandItem
                  key={o.value}
                  onSelect={() => toggle(o.value)}
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
            onClick={() => onChange(all)} // UI上“すべて選択”だが URL表現は [] で十分なので下で畳んでもOK
            disabled={allSelected}
            className="cursor-pointer"
          >
            すべて
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange([])}
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
