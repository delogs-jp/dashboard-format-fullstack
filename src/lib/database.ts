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

export const prisma =
  globalForPrisma.prisma ||
  (basePrisma.$extends(
    readReplicas({
      url: process.env.DATABASE_URL_REPLICA!,
    }),
  ) as unknown as PrismaClient);

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// ✅ Prismaの型もエクスポート
export { Prisma };
