import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Синглтон PrismaClient: в dev-режиме Next.js делает hot-reload,
// и без кэширования в globalThis каждый reload создавал бы новое подключение к БД.
// Prisma 7: подключение к PostgreSQL — через driver-адаптер @prisma/adapter-pg.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function parsePgUrl(url: string) {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 5432,
    user: parsed.username,
    password: parsed.password,
    database: parsed.pathname.replace(/^\//, ""),
  };
}

function createPrismaClient() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }
  const adapter = new PrismaPg(parsePgUrl(process.env.DATABASE_URL));
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
