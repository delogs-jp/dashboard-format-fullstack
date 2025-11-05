// src/app/(protected)/avatar/[userId]/route.ts
import { prisma } from "@/lib/database";
import { lookupSessionFromCookie } from "@/lib/auth/session";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const AVATAR_DIR =
  process.env.AVATAR_DIR && process.env.AVATAR_DIR.trim() !== ""
    ? process.env.AVATAR_DIR
    : "/var/www/private/avatars";

// 画像シグネチャでMIME判定（簡易）
function detectMime(buf: Buffer): string | null {
  if (
    buf.length > 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  )
    return "image/png";
  if (buf.length > 2 && buf[0] === 0xff && buf[1] === 0xd8) return "image/jpeg";
  if (
    buf.length > 12 &&
    buf.subarray(0, 4).toString() === "RIFF" &&
    buf.subarray(8, 12).toString() === "WEBP"
  )
    return "image/webp";
  if (buf.length > 4 && buf.subarray(0, 4).toString() === "GIF8")
    return "image/gif";
  return null;
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ userId: string }> }, // ★ 変更：Promise を受ける
) {
  // 1) 認証
  const session = await lookupSessionFromCookie();
  if (!session.ok) return new Response("Unauthorized", { status: 401 });

  // 2) 動的パラメータを await で取得
  const { userId: targetUserId } = await ctx.params; // ★ 変更：await

  // 3) ビューア&ターゲットの所属を取得（同一Departmentのみ許可）
  const [viewer, target] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
      select: { departmentId: true, isActive: true },
    }),
    prisma.user.findUnique({
      where: { id: targetUserId },
      select: { departmentId: true, isActive: true, avatar: true },
    }),
  ]);

  if (!viewer?.isActive) return new Response("Forbidden", { status: 403 });
  if (!target?.isActive) return new Response("Not Found", { status: 404 }); // 秘匿

  // 4) 認可：同一Departmentのみ
  if (viewer.departmentId !== target.departmentId) {
    return new Response("Forbidden", { status: 403 });
  }

  // 5) ファイル解決
  const fileName = target.avatar;
  if (!fileName) return new Response("Not Found", { status: 404 });

  const absPath = join(AVATAR_DIR, fileName);
  let buf: Buffer;
  try {
    buf = await readFile(absPath);
  } catch {
    return new Response("Not Found", { status: 404 });
  }

  // 6) Content-Type
  const mime = detectMime(buf) ?? "application/octet-stream";

  // 7) private 配信（キャッシュ不可）
  const body = new Uint8Array(buf); // ← Buffer を Web 互換へ
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": mime,
      "Content-Length": String(body.byteLength),
      "Cache-Control": "private, no-store",
      "Content-Disposition": "inline",
    },
  });
}
