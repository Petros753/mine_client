-- Один раз довозим до стартовых складов «Расходники» и «Товары» те филиалы,
-- у которых сейчас ноль складов. Такие филиалы бывают двух видов:
--   1) созданные до появления модели Warehouse (миграция warehouses завела
--      «Основной склад» только для филиалов с уже существующими товарами),
--   2) seed-филиалы (upsert не идёт через createBranch, поэтому автосклады
--      мимо них тоже прошли).
-- Новые филиалы через createBranch эти два склада получают сами, так что
-- миграция единоразовая — её данные не пересекаются с рантайм-логикой.

INSERT INTO "warehouses" ("id", "branchId", "name", "description")
SELECT
  'wh_default_supplies_' || b."id",
  b."id",
  'Расходники',
  'Для учёта расходных материалов'
FROM "branches" b
WHERE NOT EXISTS (
  SELECT 1 FROM "warehouses" w WHERE w."branchId" = b."id"
);

INSERT INTO "warehouses" ("id", "branchId", "name", "description")
SELECT
  'wh_default_goods_' || b."id",
  b."id",
  'Товары',
  'Для учёта продаж в магазине'
FROM "branches" b
WHERE NOT EXISTS (
  -- Второй склад заводим только там, где «Расходники» только что и был
  -- добавлен: если у филиала уже есть какие-то склады помимо только что
  -- вставленных, значит админ настроил их сам — не трогаем.
  SELECT 1 FROM "warehouses" w
  WHERE w."branchId" = b."id"
    AND w."id" <> 'wh_default_supplies_' || b."id"
);
