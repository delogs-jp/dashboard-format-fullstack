// src/components/filters/columns-checklist.tsx（新規）
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

export type ColumnOption = { value: string; label: string };

export function ColumnsChecklist({
  value,
  onChange,
  options,
  footer,
  title = "表示項目（複数選択可）",
}: {
  value: string[]; // 選択中の columnId 群
  onChange: (next: string[]) => void;
  options: ColumnOption[]; // 表示可能な列
  footer?: React.ReactNode; // 右下の閉じるボタン等
  title?: string;
}) {
  const [needle, setNeedle] = React.useState("");

  const toggle = (id: string) => {
    const set = new Set(value);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    onChange(Array.from(set));
  };

  const all = options.map((o) => o.value);
  const allSelected = value.length === all.length;
  const noneSelected = value.length === 0;

  const filtered = React.useMemo(() => {
    const q = needle.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q),
    );
  }, [needle, options]);

  return (
    <div className="flex max-h-[60vh] w-full flex-col">
      <div className="p-2">
        <Command shouldFilter={false}>
          <CommandInput
            value={needle}
            onValueChange={setNeedle}
            placeholder="項目を検索…"
          />
          <CommandEmpty>該当する項目がありません</CommandEmpty>
          <CommandGroup heading={title}>
            {filtered.map((o) => {
              const checked = value.includes(o.value);
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
            onClick={() => onChange(all)}
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
            disabled={noneSelected}
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
