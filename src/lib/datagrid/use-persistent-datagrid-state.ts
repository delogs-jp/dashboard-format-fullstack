// src/lib/datagrid/use-persistent-datagrid-state.ts
"use client";

import * as React from "react";

export function usePersistentDatagridState<T>(key: string, initial: T) {
  const [state, setState] = React.useState<T>(() => {
    if (typeof window === "undefined") return initial;
    try {
      const raw = localStorage.getItem(`datagrid:${key}`);
      return raw ? { ...initial, ...JSON.parse(raw) } : initial;
    } catch {
      return initial;
    }
  });

  React.useEffect(() => {
    try {
      localStorage.setItem(`datagrid:${key}`, JSON.stringify(state));
    } catch {
      /* noop */
    }
  }, [state, key]);

  return [state, setState] as const;
}
