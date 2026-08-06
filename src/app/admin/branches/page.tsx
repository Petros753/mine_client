import { prisma } from "@/lib/prisma";
import { requireAdminCompanyId } from "@/lib/tenant";
import { PageShell } from "@/components/workspace/page-shell";
import { BranchTable } from "@/components/workspace/branch-table";

export default async function BranchesPage() {
  const companyId = await requireAdminCompanyId();
  const branches = await prisma.branch.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
  });

  const rows = branches.map((branch) => ({
    id: branch.id,
    name: branch.name,
    address: branch.address,
    phone: branch.phone,
  }));

  return (
    <PageShell title="Филиалы" subtitle="Управление точками вашего бизнеса">
      <BranchTable branches={rows} />
    </PageShell>
  );
}
