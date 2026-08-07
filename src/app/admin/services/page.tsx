import { prisma } from "@/lib/prisma";
import { getCompanyBranches, requireAdminCompanyId } from "@/lib/tenant";
import { PageShell } from "@/components/workspace/page-shell";
import { ServiceTable } from "@/components/workspace/service-table";

export default async function ServicesPage() {
  const companyId = await requireAdminCompanyId();
  const branches = await getCompanyBranches(companyId);

  const [services, inventoryItems] = await Promise.all([
    prisma.service.findMany({
      where: { branch: { companyId } },
      include: { branch: true, ingredients: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.inventoryItem.findMany({
      where: { branch: { companyId }, isActive: true },
      select: { id: true, name: true, unit: true, branchId: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const rows = services.map((service) => ({
    id: service.id,
    branchId: service.branchId,
    branchName: service.branch.name,
    name: service.name,
    description: service.description,
    durationMinutes: service.durationMinutes,
    price: Number(service.price),
    isActive: service.isActive,
    ingredients: service.ingredients.map((i) => ({
      inventoryItemId: i.inventoryItemId,
      quantityUsed: Number(i.quantityUsed),
    })),
  }));

  const inventory = inventoryItems.map((i) => ({
    id: i.id,
    name: i.name,
    unit: i.unit,
    branchId: i.branchId,
  }));

  return (
    <PageShell title="Услуги" subtitle="Управление услугами и ценами">
      <ServiceTable
        services={rows}
        branches={branches}
        inventoryItems={inventory}
      />
    </PageShell>
  );
}
