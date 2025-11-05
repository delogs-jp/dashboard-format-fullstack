// src/components/filters/date-range-picker.tsx
"use client";

import * as React from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { X } from "lucide-react";
import { ja } from "date-fns/locale";
import type { DateRange } from "react-day-picker";

/** 画面幅が狭いときは1カ月、広いときは2カ月表示にする */
function useIsNarrow(breakpointPx = 768) {
  const [narrow, setNarrow] = React.useState(false);
  React.useEffect(() => {
    const m = window.matchMedia(`(max-width:${breakpointPx}px)`);
    const handler = () => setNarrow(m.matches);
    handler(); // 初期反映
    m.addEventListener?.("change", handler);
    return () => m.removeEventListener?.("change", handler);
  }, [breakpointPx]);
  return narrow;
}

type Props = {
  label: string;
  value?: DateRange;
  onChange: (range: DateRange | undefined) => void;
  /** 追加のクラスが必要なら渡す（任意） */
  className?: string;
};

export function DateRangePicker({ label, value, onChange, className }: Props) {
  const narrow = useIsNarrow(); // 狭いときは1カ月表示

  return (
    <div className={className}>
      <div className="p-2">
        <Calendar
          mode="range"
          numberOfMonths={narrow ? 1 : 2}
          selected={value}
          locale={ja}
          onSelect={(r) => onChange(r)}
          aria-label={`${label}の期間を選択`}
          // initialFocus は不要（現在は自動で適切にフォーカスされる）
        />
      </div>

      <div className="flex items-center justify-between border-t p-2">
        {/* 左：クリア（Popoverは閉じない） */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange(undefined)}
          type="button"
          className="cursor-pointer"
        >
          クリア
        </Button>

        {/* 右：閉じる（RadixのCloseで親Popoverを閉じる） */}
        <PopoverPrimitive.Close asChild>
          <Button
            variant="ghost"
            size="sm"
            type="button"
            className="cursor-pointer"
          >
            <X className="mr-1 h-4 w-4" />
            閉じる
          </Button>
        </PopoverPrimitive.Close>
      </div>
    </div>
  );
}
