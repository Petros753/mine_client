import { prisma } from "@/lib/prisma";
import { getCompanyBranches, requireAdminCompanyId } from "@/lib/tenant";
import { PageShell } from "@/components/workspace/page-shell";
import { ServiceTable } from "@/components/workspace/service-table";

export default async function ServicesPage() {
  const companyId = await requireAdminCompanyId();
  const branches = await getCompanyBranches(companyId);

  const services = await prisma.service.findMany({
    where: { branch: { companyId } },
    include: { branch: true },
    orderBy: { createdAt: "desc" },
  });

  const rows = services.map((service) => ({
    id: service.id,
    branchId: service.branchId,
    branchName: service.branch.name,
    name: service.name,
    description: service.description,
    durationMinutes: service.durationMinutes,
    price: Number(service.price),
    isActive: service.isActive,
  }));

  return (
    <PageShell title="Услуги" subtitle="Управление услугами и ценами">
      <ServiceTable services={rows} branches={branches} />
    </PageShell>
  );
}
