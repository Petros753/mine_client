import { PrismaClient } from "@prisma/client";

// Синглтон PrismaClient: в dev-режиме Next.js делает hot-reload,
// и без кэширования в globalThis каждый reload создавал бы новое подключение к БД.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
