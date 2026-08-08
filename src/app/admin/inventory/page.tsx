import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getCompanyBranches, requireAdminCompanyId } from "@/lib/tenant";
import { PageShell } from "@/components/workspace/page-shell";
import { InventoryTable } from "@/components/workspace/inventory-table";
import { INVENTORY_BRANCH_COOKIE } from "./constants";

interface InventoryPageProps {
  searchParams: Promise<{
    warehouseId?: string;
    branchId?: string;
    hidden?: string;
  }>;
}

export default async function InventoryPage({ searchParams }: InventoryPageProps) {
  const companyId = await requireAdminCompanyId();
  const [branches, warehouses, oldestBranch, cookieStore] = await Promise.all([
    getCompanyBranches(companyId),
    prisma.warehouse.findMany({
      where: { branch: { companyId } },
      include: { branch: { select: { id: true, name: true } } },
      orderBy: [{ branch: { name: "asc" } }, { createdAt: "asc" }],
    }),
    // Первый созданный филиал — стабильный дефолт для нового юзера без
    // cookie. Алфавитный порядок как дефолт вводит в заблуждение: «Paul
    // Lihten» опережает «Филиал на Арбате», но админ считает «главным»
    // первый заведённый.
    prisma.branch.findFirst({
      where: { companyId },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    }),
    cookies(),
  ]);

  const {
    warehouseId: requestedWarehouseId,
    branchId: requestedBranchId,
    hidden: showHiddenParam,
  } = await searchParams;

  // «Показать скрытые» — соф-удалённые товары. По умолчанию не показываем,
  // чтобы список не засорялся; чекбокс сверху даёт вернуться и восстановить.
  const showHidden = showHiddenParam === "1";

  // Активный филиал (в порядке приоритета):
  //   1) филиал явно указанного склада — так шеринг ?warehouseId=... работает,
  //   2) явно указанный branchId в URL,
  //   3) последний выбор пользователя из cookie inv_branchId,
  //   4) первый созданный филиал (createdAt asc, а не по алфавиту).
  // Чужой/несуществующий id тихо откатывается на следующий вариант, а не сбрасывает URL.
  const requestedWarehouse = warehouses.find(
    (w) => w.id === requestedWarehouseId
  );
  const cookieBranchId = cookieStore.get(INVENTORY_BRANCH_COOKIE)?.value;
  const activeBranchId =
    requestedWarehouse?.branchId ??
    branches.find((b) => b.id === requestedBranchId)?.id ??
    branches.find((b) => b.id === cookieBranchId)?.id ??
    oldestBranch?.id ??
    null;

  // Активный склад: явный warehouseId, иначе первый склад активного филиала.
  // Если у филиала складов нет — activeWarehouse = null, таблица покажет
  // подсказку «создайте склад», а не молча покажет чужие товары.
  const activeWarehouse =
    requestedWarehouse ??
    warehouses.find((w) => w.branchId === activeBranchId) ??
    null;

  const items = activeWarehouse
    ? await prisma.inventoryItem.findMany({
        where: {
          warehouseId: activeWarehouse.id,
          ...(showHidden ? {} : { isActive: true }),
        },
        orderBy: { createdAt: "desc" },
      })
    : [];

  const rows = items.map((item) => ({
    id: item.id,
    warehouseId: item.warehouseId,
    name: item.name,
    sku: item.sku,
    unit: item.unit,
    quantity: Number(item.quantity),
    costPrice: Number(item.costPrice),
    minQuantity: item.minQuantity !== null ? Number(item.minQuantity) : null,
    isActive: item.isActive,
  }));

  const warehouseOptions = warehouses.map((w) => ({
    id: w.id,
    name: w.name,
    branchId: w.branchId,
    branchName: w.branch.name,
  }));

  return (
    <PageShell title="Товары" subtitle="Остатки склада и пополнение">
      <InventoryTable
        items={rows}
        branches={branches}
        warehouses={warehouseOptions}
        activeBranchId={activeBranchId}
        activeWarehouseId={activeWarehouse?.id ?? null}
        showHidden={showHidden}
      />
    </PageShell>
  );
}
