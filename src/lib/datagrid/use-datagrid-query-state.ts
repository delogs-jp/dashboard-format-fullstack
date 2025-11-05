// src/lib/datagrid/use-datagrid-query-state.ts
// URL <-> state 同期に加え、URLが空の復帰時は sessionStorage から復元
"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type AnyState = Record<string, unknown>;

type Options = {
  /** URLに無いときの復元・退避に使うキー（例: "users"） */
  persistKey?: string;
  /** 退避先のストレージ。通常は戻る操作に強い session を推奨 */
  storage?: "session" | "local";
};

// --- JSONの安定化（キー昇順で直列化） ---
function stableStringify(v: unknown): string {
  if (v && typeof v === "object" && !Array.isArray(v)) {
    const obj = v as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const k of Object.keys(obj).sort()) sorted[k] = obj[k];
    return JSON.stringify(sorted);
  }
  return JSON.stringify(v);
}

function encodeValue(v: unknown): string {
  return encodeURIComponent(stableStringify(v));
}

function decodeValue<T>(s: string | null, fallback: T): T {
  if (!s) return fallback;
  try {
    const parsed = JSON.parse(decodeURIComponent(s));
    return parsed as T;
  } catch {
    return fallback;
  }
}

function getStore(o?: Options) {
  if (o?.storage === "local")
    return typeof window !== "undefined" ? window.localStorage : undefined;
  return typeof window !== "undefined" ? window.sessionStorage : undefined;
}

export function useDatagridQueryState<T extends AnyState>(
  ns: string,
  initial: T,
  options?: Options,
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const store = getStore(options);

  // 1) 初期化：URL > storage(persistKey) > initial の優先順位で読み込む
  const [state, setState] = React.useState<T>(() => {
    const fromUrl = decodeValue<T>(searchParams.get(ns), initial);
    if (fromUrl !== initial) return fromUrl;

    if (options?.persistKey && store) {
      try {
        const raw = store.getItem(`dg:${options.persistKey}`);
        if (raw) {
          const parsed = JSON.parse(raw) as T;
          return { ...initial, ...parsed };
        }
      } catch {
        /* noop */
      }
    }
    return initial;
  });

  // 2) 初回 Hydration 完了フラグ（SSR一致のため、初回はURL書き込みを抑制）
  const mountedRef = React.useRef(false);
  React.useEffect(() => {
    mountedRef.current = true;
  }, []);

  // 3) URL 同期（等価なら何もしない）
  React.useEffect(() => {
    if (!mountedRef.current) return;

    const sp = new URLSearchParams(searchParams.toString());
    const current = sp.get(ns);
    const next = encodeValue(state);
    if (current === next) return;

    sp.set(ns, next);
    router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
  }, [ns, pathname, router, searchParams, state]);

  // 4) storage 同期（戻る復元用）
  React.useEffect(() => {
    if (!options?.persistKey || !store) return;
    try {
      store.setItem(`dg:${options.persistKey}`, JSON.stringify(state));
    } catch {
      /* noop */
    }
  }, [state, options?.persistKey, store]);

  return [state, setState];
}
