import { isToday, isTomorrow } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/tenant";
import { STATUS_META } from "@/lib/appointments";
import { PageShell } from "@/components/workspace/page-shell";
import { MyAppointmentsCalendar } from "@/components/workspace/my-appointments-calendar";

export const metadata = {
  title: "Мои записи",
};

export const dynamic = "force-dynamic";

const STATUS_VARIANT_MAP: Record<
  keyof typeof STATUS_META,
  "default" | "secondary" | "destructive" | "outline"
> = {
  PENDING: "secondary",
  CONFIRMED: "default",
  COMPLETED: "outline",
  CANCELLED: "destructive",
  NO_SHOW: "destructive",
};

export default async function MyAppointmentsPage() {
  const session = await requireSession();
  const employee = await prisma.employee.findUnique({
    where: { userId: session.user.id },
    include: { branch: { select: { name: true } } },
  });

  if (!employee) {
    return (
      <PageShell title="Мои записи">
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-semibold text-foreground">
              Профиль сотрудника не найден
            </h1>
            <p className="mt-2 text-muted-foreground">
              Обратитесь к администратору, чтобы вас добавили в штат.
            </p>
          </div>
        </div>
      </PageShell>
    );
  }

  const now = new Date();
  const appointments = await prisma.appointment.findMany({
    where: {
      employeeId: employee.id,
      startAt: { gte: now },
      status: { notIn: ["CANCELLED", "NO_SHOW"] },
    },
    include: {
      client: true,
      service: true,
    },
    orderBy: { startAt: "asc" },
  });

  const toMyAppointment = (apt: (typeof appointments)[number]) => ({
    id: apt.id,
    startAt: apt.startAt.toISOString(),
    clientName: [apt.client.firstName, apt.client.lastName].filter(Boolean).join(" "),
    clientPhone: apt.client.phone,
    serviceName: apt.service.name,
    durationMinutes: apt.service.durationMinutes,
    price: Number(apt.price),
    statusLabel: STATUS_META[apt.status].label,
    statusVariant: STATUS_VARIANT_MAP[apt.status],
  });

  const today = appointments.filter((a) => isToday(a.startAt)).map(toMyAppointment);
  const tomorrow = appointments.filter((a) => isTomorrow(a.startAt)).map(toMyAppointment);

  return (
    <PageShell
      title="Мои записи"
      subtitle={`${employee.branch.name}${employee.position ? ` · ${employee.position}` : ""}`}
    >
      <MyAppointmentsCalendar
        today={today}
        tomorrow={tomorrow}
        branchName={employee.branch.name}
        position={employee.position}
      />
    </PageShell>
  );
}
