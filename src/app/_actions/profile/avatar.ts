// src/app/_actions/profile/avatar.ts
"use server";

import { prisma } from "@/lib/database";
import { randomUUID } from "crypto";
import { writeFile, unlink, mkdir } from "node:fs/promises";
import { access, constants } from "node:fs";
import { join } from "node:path";
import { lookupSessionFromCookie } from "@/lib/auth/session";
import { profileUpdateSchema, MAX_IMAGE_MB } from "@/lib/users/schema";

const AVATAR_DIR =
  process.env.AVATAR_DIR && process.env.AVATAR_DIR.trim() !== ""
    ? process.env.AVATAR_DIR
    : "/var/www/private/avatars";

type ActionResult =
  | { ok: true }
  | { ok: false; fieldErrors?: Record<string, string>; message?: string };

function getExtFromMime(mime: string): string | null {
  switch (mime) {
    case "image/png":
      return "png";
    case "image/jpeg":
      return "jpg";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    default:
      return null;
  }
}

// 簡易シグネチャ検証（magic bytes）: PNG/JPEG/WebP/GIF
function looksValidBySignature(buf: Buffer, mime: string): boolean {
  if (mime === "image/png") {
    // 89 50 4E 47 0D 0A 1A 0A
    return (
      buf.length > 8 &&
      buf[0] === 0x89 &&
      buf[1] === 0x50 &&
      buf[2] === 0x4e &&
      buf[3] === 0x47
    );
  }
  if (mime === "image/jpeg") {
    // FF D8 ... FF D9
    return buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8;
  }
  if (mime === "image/webp") {
    // "RIFF" .... "WEBP"
    return (
      buf.length > 12 &&
      buf.subarray(0, 4).toString() === "RIFF" &&
      buf.subarray(8, 12).toString() === "WEBP"
    );
  }
  if (mime === "image/gif") {
    // "GIF8"
    return buf.length > 4 && buf.subarray(0, 4).toString() === "GIF8";
  }
  return false;
}

async function ensureDir(dir: string) {
  await mkdir(dir, { recursive: true });
}

async function fileExists(path: string): Promise<boolean> {
  return new Promise((resolve) => {
    access(path, constants.F_OK, (err) => resolve(!err));
  });
}

/**
 * プロフィール更新（氏名＋アバター画像）
 * - APIは使わずServer Actionのみ
 * - 画像はUUID名で保存し、User.avatarに「ファイル名」を保存
 */
export async function updateProfileAction(
  formData: FormData,
): Promise<ActionResult> {
  // 1) 認証
  const session = await lookupSessionFromCookie();
  if (!session.ok) return { ok: false, message: "認証が必要です" };

  // 2) クライアント側と同様のzodスキーマで name / phone / avatarFile を検証（UIの改ざん対策）
  const name = String(formData.get("name") ?? "");
  const phoneRaw = formData.get("phone"); // ★追加
  const avatarFile = formData.get("avatarFile");
  const input = {
    name,
    phone: typeof phoneRaw === "string" ? phoneRaw : undefined, // ★追加： 空なら undefined
    avatarFile: avatarFile instanceof File ? avatarFile : undefined,
  };

  const parsed = await (async () => {
    // profileUpdateSchemaは File | undefined を許容
    const r = profileUpdateSchema.safeParse(input);
    return r;
  })();

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]?.toString() || "form";
      fieldErrors[key] = issue.message;
    }
    return { ok: false, fieldErrors };
  }

  // 3) アバターがある場合はサーバ側でもMIME/容量/シグネチャを検証して保存
  let newAvatarFileName: string | null = null;
  let oldAvatarFileName: string | null = null;

  if (parsed.data.avatarFile) {
    const f = parsed.data.avatarFile;
    const mime = f.type;
    const ext = getExtFromMime(mime);
    if (!ext) {
      return {
        ok: false,
        fieldErrors: { avatarFile: "許可されていない画像形式です" },
      };
    }

    const bytes = await f.arrayBuffer();
    const buf = Buffer.from(bytes);

    // 容量の再チェック（サーバ側）
    if (buf.byteLength > MAX_IMAGE_MB * 1024 * 1024) {
      return {
        ok: false,
        fieldErrors: {
          avatarFile: `画像サイズは ${MAX_IMAGE_MB}MB 以下にしてください`,
        },
      };
    }

    if (!looksValidBySignature(buf, mime)) {
      return {
        ok: false,
        fieldErrors: { avatarFile: "画像ファイルの形式を確認できませんでした" },
      };
    }

    // 4) 保存（UUID + 拡張子）
    await ensureDir(AVATAR_DIR);
    const uuid = randomUUID();
    const fileName = `${uuid}.${ext}`;
    const absPath = join(AVATAR_DIR, fileName);
    await writeFile(absPath, buf, { flag: "wx" }); // 上書き防止

    newAvatarFileName = fileName;
  }

  // 5) DB更新（トランザクション）
  await prisma.$transaction(async (tx) => {
    // 旧ファイル名の取得（新規保存があるときのみ）
    if (newAvatarFileName) {
      const current = await tx.user.findUnique({
        where: { id: session.userId },
        select: { avatar: true },
      });
      oldAvatarFileName = current?.avatar ?? null;
    }

    await tx.user.update({
      where: { id: session.userId },
      data: {
        name: parsed.data.name,
        phone: parsed.data.phone, // ★ 追加
        ...(newAvatarFileName ? { avatar: newAvatarFileName } : {}),
      },
    });
  });

  // 6) 旧ファイルの削除（新ファイルのDB反映が済んでから）
  if (oldAvatarFileName) {
    const oldPath = join(AVATAR_DIR, oldAvatarFileName);
    if (await fileExists(oldPath)) {
      // エラーは握りつぶしてOK（ログへ）
      await unlink(oldPath).catch(() => {});
    }
  }

  return { ok: true };
}

/**
 * 自分自身のアバターを削除（DB: avatar=null → 旧ファイルを物理削除）
 * - 引数で userId を受け取らない（権限昇格防止）
 * - 旧ファイルが無くても成功扱い（冪等）
 */
export async function deleteOwnAvatarAction(): Promise<ActionResult> {
  const session = await lookupSessionFromCookie();
  if (!session.ok) return { ok: false, message: "認証が必要です" };

  try {
    await ensureDir(AVATAR_DIR);

    // 先に現在のファイル名を取得
    const current = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { avatar: true, isActive: true },
    });
    if (!current?.isActive) {
      return { ok: false, message: "ユーザーが無効化されています" };
    }
    // 何も登録されていなくても冪等に成功返し
    const oldFileName = current.avatar ?? null;

    // DB更新（トランザクションで確実に avatar=null）
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: session.userId },
        data: { avatar: null },
      });
    });

    // 物理削除（DBコミット後）
    if (oldFileName) {
      const abs = join(AVATAR_DIR, oldFileName);
      if (await fileExists(abs)) {
        await unlink(abs).catch(() => {});
      }
    }

    return { ok: true };
  } catch (e) {
    console.error(e);
    return { ok: false, message: "アバター削除に失敗しました" };
  }
}
