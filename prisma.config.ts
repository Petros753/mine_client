// Prisma 7: конфигурация CLI (migrate, generate)
// URL подключения берётся из .env (DATABASE_URL)
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  // В Prisma 7.9 у datasource в конфиге CLI есть только url и shadowDatabaseUrl.
  // Драйвер-адаптер задаётся в рантайме — см. src/lib/prisma.ts.
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
