// src/lib/auth/jwt.ts
import { SignJWT, jwtVerify } from "jose";

const alg = "HS256";
const encoder = () => new TextEncoder().encode(process.env.JWT_SECRET ?? "");

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  // 起動時に早期発見したいため例外化（本番では適宜ハンドリング）
  throw new Error(
    "JWT_SECRET is missing or too short (>=32 chars recommended).",
  );
}

export type SessionJwtPayload = {
  jti: string; // Session.id
  // exp は SignJWT 側で設定
};

export async function signSessionJwt(
  payload: SessionJwtPayload,
  ttlSeconds: number,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const token = await new SignJWT({ jti: payload.jti })
    .setProtectedHeader({ alg })
    .setIssuedAt(now)
    .setExpirationTime(now + ttlSeconds)
    .sign(encoder());
  return token;
}

export async function verifySessionJwt(
  token: string,
): Promise<{ jti: string }> {
  const { payload, protectedHeader } = await jwtVerify(token, encoder(), {
    algorithms: [alg],
  });
  if (protectedHeader.alg !== alg) {
    throw new Error("Invalid JWT alg");
  }
  const jti = (payload as unknown as { jti?: string }).jti;
  if (!jti) throw new Error("JWT missing jti");
  return { jti };
}
