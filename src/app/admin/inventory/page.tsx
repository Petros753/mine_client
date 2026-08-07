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

  // Активный склад: приоритет — явный warehouseId в URL. Если задан только
  // branchId (переключение филиала через topbar), берём первый склад филиала.
  // Иначе — первый склад по порядку.
  const activeWarehouse =
    warehouses.find((w) => w.id === requestedWarehouseId) ??
    warehouses.find((w) => w.branchId === requestedBranchId) ??
    warehouses[0] ??
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
        activeWarehouseId={activeWarehouse?.id ?? null}
      />
    </PageShell>
  );
}
