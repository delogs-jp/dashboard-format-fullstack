// src/components/filters/status-filter.tsx
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export type StatusValue = "ALL" | "ACTIVE" | "INACTIVE";

export function StatusFilter({
  value,
  onChange,
  footer,
  className,
  labels = { all: "すべて", active: "有効のみ", inactive: "無効のみ" },
}: {
  value: StatusValue;
  onChange: (next: StatusValue) => void;
  /** 右下に「閉じる」などを差し込みたいときに使用（任意） */
  footer?: React.ReactNode;
  className?: string;
  /** 表示ラベルの差し替え（任意） */
  labels?: { all: string; active: string; inactive: string };
}) {
  return (
    <div
      className={["flex max-h-[60vh] w-full flex-col", className || ""].join(
        " ",
      )}
    >
      <div className="space-y-2 p-2">
        <Button
          variant={value === "ALL" ? "default" : "outline"}
          size="sm"
          onClick={() => onChange("ALL")}
          className="w-full cursor-pointer justify-start"
        >
          {labels.all}
        </Button>
        <Button
          variant={value === "ACTIVE" ? "default" : "outline"}
          size="sm"
          onClick={() => onChange("ACTIVE")}
          className="w-full cursor-pointer justify-start"
        >
          {labels.active}
        </Button>
        <Button
          variant={value === "INACTIVE" ? "default" : "outline"}
          size="sm"
          onClick={() => onChange("INACTIVE")}
          className="w-full cursor-pointer justify-start"
        >
          {labels.inactive}
        </Button>
      </div>

      <Separator />

      <div className="flex items-center justify-end gap-2 p-2">{footer}</div>
    </div>
  );
}
