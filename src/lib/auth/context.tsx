// src/lib/auth/context.tsx
"use client";

import { createContext, useContext, useState, useEffect } from "react";
import type { AuthContextValue, AuthUserSnapshot } from "./types";

const AuthContext = createContext<AuthContextValue>({
  ready: false,
  user: null,
  setUser: () => {}, // デフォルトno-op
});

export function AuthProvider({
  initialUser,
  children,
}: {
  initialUser: AuthUserSnapshot | null;
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<AuthUserSnapshot | null>(initialUser);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // 初期化完了フラグを立てる
    setReady(true);
  }, []);

  const value: AuthContextValue = {
    ready,
    user,
    setUser,
    refresh: async () => {
      // 将来: /_actions/auth/refresh などから再取得する仕組みを実装予定
      setUser(user);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
