import { format, endOfWeek, startOfWeek } from "date-fns";
import { prisma } from "@/lib/prisma";
import {
  formatDateParam,
  parseCalendarDate,
  parseCalendarView,
} from "@/lib/calendar";
import { getCalendarAppointments } from "@/lib/calendar-data";
import {
  getCompanyBranches,
  requireAdminOrOwner,
  resolveBranchId,
} from "@/lib/tenant";
import { CalendarWorkspace } from "@/components/workspace/calendar-workspace";
import { EmptyState } from "@/components/workspace/empty-state";

export const metadata = {
  title: "Календарь",
};

export const dynamic = "force-dynamic";

export default async function AdminCalendarPage({
  searchParams,
}: PageProps<"/admin">) {
  const query = await searchParams;
  const first = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;

  const session = await requireAdminOrOwner();
  const branches = await getCompanyBranches(session.user.companyId);
  const branchId = resolveBranchId(branches, first(query.branchId));

  if (!branchId) {
    return (
      <EmptyState
        title="Нет филиалов"
        description="Создайте первый филиал, чтобы работать с календарём."
        actionHref="/admin/branches/new"
        actionLabel="Создать филиал"
      />
    );
  }

  const date = parseCalendarDate(first(query.date));
  const view = parseCalendarView(first(query.view));

  const rangeFrom = view === "week" ? startOfWeek(date, { weekStartsOn: 1 }) : date;
  const rangeTo = view === "week" ? endOfWeek(date, { weekStartsOn: 1 }) : date;

  const [employeeRows, serviceRows, appointments] = await Promise.all([
    prisma.employee.findMany({
      where: { branchId },
      include: {
        user: { select: { firstName: true, lastName: true } },
        services: { select: { serviceId: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.service.findMany({
      where: { branchId, isActive: true },
      orderBy: { name: "asc" },
    }),
    getCalendarAppointments({ branchId, from: rangeFrom, to: rangeTo }),
  ]);

  return (
    <CalendarWorkspace
      date={formatDateParam(date)}
      today={format(new Date(), "yyyy-MM-dd")}
      view={view}
      role={session.user.role}
      branchId={branchId}
      branches={branches}
      employees={employeeRows.map((employee) => ({
        id: employee.id,
        name: [employee.user.firstName, employee.user.lastName]
          .filter(Boolean)
          .join(" "),
        position: employee.position,
        serviceIds: employee.services.map((link) => link.serviceId),
      }))}
      services={serviceRows.map((service) => ({
        id: service.id,
        name: service.name,
        durationMinutes: service.durationMinutes,
        price: Number(service.price),
      }))}
      appointments={appointments}
    />
  );
}
