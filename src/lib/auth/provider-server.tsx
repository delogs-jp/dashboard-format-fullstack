// src/lib/auth/provider-server.tsx
import { lookupSessionFromCookie } from "./session";
import { getUserSnapshot } from "./user-snapshot";
import { AuthProvider } from "./context";

export async function AuthProviderServer({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await lookupSessionFromCookie();
  if (!session.ok) {
    return <AuthProvider initialUser={null}>{children}</AuthProvider>;
  }

  const snapshot = await getUserSnapshot(session.userId);
  return <AuthProvider initialUser={snapshot}>{children}</AuthProvider>;
}
