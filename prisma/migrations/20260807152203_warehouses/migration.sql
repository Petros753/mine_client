-- Разбиваем склад филиала на несколько независимых складов (как в YCLIENTS).
-- Существующие товары переезжают в единственный дефолтный склад «Основной склад»
-- своего же филиала — данные не теряем.

-- 1. Создаём таблицу складов
CREATE TABLE "warehouses" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "warehouses_branchId_idx" ON "warehouses"("branchId");

ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_branchId_fkey"
  FOREIGN KEY ("branchId") REFERENCES "branches"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- 2. Заводим по одному дефолтному складу «Основной склад» на каждый филиал,
--    в котором уже есть товары. Пустых филиалов не трогаем — стартовые
--    склады им создадутся автоматически при создании нового филиала;
--    у существующих филиалов админ заведёт склады через UI, когда понадобится.
INSERT INTO "warehouses" ("id", "branchId", "name", "description")
SELECT
  'wh_backfill_' || b."id",
  b."id",
  'Основной склад',
  'Автосозданный склад для товаров, заведённых до появления нескольких складов'
FROM "branches" b
WHERE EXISTS (
  SELECT 1 FROM "inventory_items" i WHERE i."branchId" = b."id"
);

-- 3. Добавляем warehouseId в inventory_items, сначала как nullable — чтобы
--    заполнить существующие строки бэкфилл-складом их филиала
ALTER TABLE "inventory_items" ADD COLUMN "warehouseId" TEXT;

UPDATE "inventory_items" i
SET "warehouseId" = w."id"
FROM "warehouses" w
WHERE w."branchId" = i."branchId";

-- 4. Теперь можно потребовать NOT NULL и снять старую связь с branch
ALTER TABLE "inventory_items" ALTER COLUMN "warehouseId" SET NOT NULL;

ALTER TABLE "inventory_items" DROP CONSTRAINT "inventory_items_branchId_fkey";
DROP INDEX "inventory_items_branchId_idx";
ALTER TABLE "inventory_items" DROP COLUMN "branchId";
ALTER TABLE "inventory_items" ALTER COLUMN "updatedAt" DROP DEFAULT;

CREATE INDEX "inventory_items_warehouseId_idx" ON "inventory_items"("warehouseId");

ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_warehouseId_fkey"
  FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
