// src/lib/database.ts
import { PrismaClient, Prisma } from "@prisma/client";
import { readReplicas } from "@prisma/extension-read-replicas";

const globalForPrisma = global as typeof globalThis & { prisma?: PrismaClient };

const basePrisma = new PrismaClient({
  log:
    process.env.NODE_ENV === "development"
      ? ["query", "info", "warn", "error"]
      : ["error"],
});

// --- ▼ 修正箇所 ▼ ---

// 1. リードレプリカのURLを変数として取得（'!' を削除）
const replicaUrl = process.env.DATABASE_URL_REPLICA;

// 2. replicaUrl が存在する場合のみ $extends を呼び出す
const extendedPrisma = replicaUrl
  ? (basePrisma.$extends(
      readReplicas({
        url: replicaUrl,
      }),
    ) as unknown as PrismaClient)
  : (basePrisma as unknown as PrismaClient); // 存在しない場合は basePrisma をそのまま使用

export const prisma = globalForPrisma.prisma || extendedPrisma;

// --- ▲ 修正箇所 ▲ ---

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// ✅ Prismaの型もエクスポート
export { Prisma };
