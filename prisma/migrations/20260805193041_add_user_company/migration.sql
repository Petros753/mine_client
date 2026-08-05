-- Привязка пользователя к компании (арендатору).
--
-- Колонка обязательная, но в таблице уже есть строки, поэтому добавляем её
-- в три шага: nullable → backfill → NOT NULL.

-- 1. Добавляем колонку допускающей NULL
ALTER TABLE "users" ADD COLUMN "companyId" TEXT;

-- 2. Привязываем существующих пользователей к самой первой компании.
--    Если компаний нет вовсе, а пользователи есть — заводим компанию-заглушку,
--    иначе шаг 3 не сможет выставить NOT NULL.
DO $$
DECLARE
  target_company_id TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM "users") THEN
    SELECT "id" INTO target_company_id
    FROM "companies"
    ORDER BY "createdAt" ASC
    LIMIT 1;

    IF target_company_id IS NULL THEN
      target_company_id := 'orphan-users-company';
      INSERT INTO "companies" ("id", "name", "industry", "timezone", "createdAt", "updatedAt")
      VALUES (target_company_id, 'Компания без владельца', 'OTHER', 'Europe/Moscow', now(), now());
    END IF;

    UPDATE "users" SET "companyId" = target_company_id WHERE "companyId" IS NULL;
  END IF;
END $$;

-- 3. Делаем колонку обязательной
ALTER TABLE "users" ALTER COLUMN "companyId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "users_companyId_idx" ON "users"("companyId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
