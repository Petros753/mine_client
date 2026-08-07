import { prisma } from "@/lib/prisma";
import { getCompanyBranches, requireAdminCompanyId } from "@/lib/tenant";
import { PageShell } from "@/components/workspace/page-shell";
import { InventoryTable } from "@/components/workspace/inventory-table";

interface InventoryPageProps {
  searchParams: Promise<{ warehouseId?: string; branchId?: string }>;
}

export default async function InventoryPage({ searchParams }: InventoryPageProps) {
  const companyId = await requireAdminCompanyId();
  const [branches, warehouses] = await Promise.all([
    getCompanyBranches(companyId),
    prisma.warehouse.findMany({
      where: { branch: { companyId } },
      include: { branch: { select: { id: true, name: true } } },
      orderBy: [{ branch: { name: "asc" } }, { createdAt: "asc" }],
    }),
  ]);

  const { warehouseId: requestedWarehouseId, branchId: requestedBranchId } =
    await searchParams;

  // Активный филиал (в порядке приоритета):
  //   1) филиал явно указанного склада — так шеринг ?warehouseId=... работает,
  //   2) явно указанный branchId в URL,
  //   3) первый филиал компании.
  // Если запрошенный склад/филиал чужой (или не существует) — просто откатываемся
  // на следующий вариант, а не молча меняем URL.
  const requestedWarehouse = warehouses.find(
    (w) => w.id === requestedWarehouseId
  );
  const activeBranchId =
    requestedWarehouse?.branchId ??
    branches.find((b) => b.id === requestedBranchId)?.id ??
    branches[0]?.id ??
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
        where: { warehouseId: activeWarehouse.id },
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
      />
    </PageShell>
  );
}
