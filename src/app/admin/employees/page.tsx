import { prisma } from "@/lib/prisma";
import { getCompanyBranches, requireAdminCompanyId } from "@/lib/tenant";
import { PageShell } from "@/components/workspace/page-shell";
import { EmployeeTable } from "@/components/workspace/employee-table";

export default async function EmployeesPage() {
  const companyId = await requireAdminCompanyId();
  const branches = await getCompanyBranches(companyId);

  const employees = await prisma.employee.findMany({
    where: { branch: { companyId } },
    include: { user: true, branch: true, services: true, invitations: true },
    orderBy: { createdAt: "desc" },
  });

  const now = new Date();

  const rows = employees.map((employee) => {
    // Приглашение считается «в пути», пока ни одно не использовано,
    // а последнее ещё не истекло
    const hasAccepted = employee.invitations.some((i) => i.usedAt !== null);
    const pendingInvitation =
      !hasAccepted &&
      employee.invitations.some((i) => i.usedAt === null && i.expiresAt > now);

    return {
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
      invitationPending: pendingInvitation,
      invitationAccepted: hasAccepted,
    };
  });

  return (
    <PageShell title="Сотрудники" subtitle="Управление мастерами и специалистами">
      <EmployeeTable employees={rows} branches={branches} />
    </PageShell>
  );
}
