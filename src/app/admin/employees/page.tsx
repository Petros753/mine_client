import { prisma } from "@/lib/prisma";
import { getCompanyBranches, requireAdminCompanyId } from "@/lib/tenant";
import { PageShell } from "@/components/workspace/page-shell";
import { EmployeeTable } from "@/components/workspace/employee-table";

export default async function EmployeesPage() {
  const companyId = await requireAdminCompanyId();
  const branches = await getCompanyBranches(companyId);

  const employees = await prisma.employee.findMany({
    where: { branch: { companyId } },
    include: { user: true, branch: true, services: true },
    orderBy: { createdAt: "desc" },
  });

  const rows = employees.map((employee) => ({
    id: employee.id,
    firstName: employee.user.firstName,
    lastName: employee.user.lastName,
    email: employee.user.email,
    phone: employee.user.phone,
    position: employee.position,
    branchId: employee.branchId,
    branchName: employee.branch.name,
    isBookable: employee.isBookable,
    servicesCount: employee.services.length,
  }));

  return (
    <PageShell title="Сотрудники" subtitle="Управление мастерами и специалистами">
      <EmployeeTable employees={rows} branches={branches} />
    </PageShell>
  );
}
