import { prisma } from "@/lib/prisma";
import { getCompanyBranches, requireAdminCompanyId } from "@/lib/tenant";
import { PageShell } from "@/components/workspace/page-shell";
import { InventoryTable } from "@/components/workspace/inventory-table";

export default async function InventoryPage() {
  const companyId = await requireAdminCompanyId();
  const branches = await getCompanyBranches(companyId);

  const items = await prisma.inventoryItem.findMany({
    where: { branch: { companyId } },
    include: { branch: true },
    orderBy: { createdAt: "desc" },
  });

  const rows = items.map((item) => ({
    id: item.id,
    branchId: item.branchId,
    branchName: item.branch.name,
    name: item.name,
    sku: item.sku,
    unit: item.unit,
    quantity: Number(item.quantity),
    costPrice: Number(item.costPrice),
    minQuantity: item.minQuantity !== null ? Number(item.minQuantity) : null,
    isActive: item.isActive,
  }));

  return (
    <PageShell title="Склад" subtitle="Товары, остатки и пополнение">
      <InventoryTable items={rows} branches={branches} />
    </PageShell>
  );
}
