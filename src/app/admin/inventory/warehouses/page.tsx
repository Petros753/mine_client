import { prisma } from "@/lib/prisma";
import { getCompanyBranches, requireAdminCompanyId } from "@/lib/tenant";
import { PageShell } from "@/components/workspace/page-shell";
import { WarehouseTable } from "@/components/workspace/warehouse-table";

export default async function WarehousesPage() {
  const companyId = await requireAdminCompanyId();
  const branches = await getCompanyBranches(companyId);

  const warehouses = await prisma.warehouse.findMany({
    where: { branch: { companyId } },
    include: {
      branch: { select: { id: true, name: true } },
      _count: { select: { items: true } },
    },
    orderBy: [{ branch: { name: "asc" } }, { createdAt: "asc" }],
  });

  const rows = warehouses.map((w) => ({
    id: w.id,
    branchId: w.branchId,
    branchName: w.branch.name,
    name: w.name,
    description: w.description,
    itemsCount: w._count.items,
  }));

  return (
    <PageShell title="Склады" subtitle="Группировка товаров внутри филиалов">
      <WarehouseTable warehouses={rows} branches={branches} />
    </PageShell>
  );
}
