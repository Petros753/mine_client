import { format, isPast, isToday, isTomorrow } from "date-fns";
import { ru } from "date-fns/locale";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/tenant";
import { STATUS_META } from "@/lib/appointments";

export const metadata = {
  title: "Мои записи",
};

export const dynamic = "force-dynamic";

export default async function MyAppointmentsPage() {
  const session = await requireSession();
  const employee = await prisma.employee.findUnique({
    where: { userId: session.user.id },
    include: { branch: { select: { name: true } } },
  });

  if (!employee) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            Профиль сотрудника не найден
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Обратитесь к администратору, чтобы вас добавили в штат.
          </p>
        </div>
      </div>
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

  const grouped = {
    today: appointments.filter((a) => isToday(a.startAt)),
    tomorrow: appointments.filter((a) => isTomorrow(a.startAt)),
    later: appointments.filter(
      (a) => !isToday(a.startAt) && !isTomorrow(a.startAt)
    ),
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Мои записи
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {employee.branch.name} · {employee.position}
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {appointments.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-zinc-600 dark:text-zinc-400">
              У вас нет предстоящих записей.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            <AppointmentGroup
              title="Сегодня"
              appointments={grouped.today}
            />
            <AppointmentGroup
              title="Завтра"
              appointments={grouped.tomorrow}
            />
            <AppointmentGroup
              title="Позже"
              appointments={grouped.later}
            />
          </div>
        )}
      </main>
    </div>
  );
}

function AppointmentGroup({
  title,
  appointments,
}: {
  title: string;
  appointments: Array<{
    id: string;
    startAt: Date;
    client: { firstName: string; lastName: string | null; phone: string | null };
    service: { name: string; durationMinutes: number };
    status: keyof typeof STATUS_META;
    price: { toString(): string };
  }>;
}) {
  if (appointments.length === 0) return null;

  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        {title}
      </h2>
      <div className="overflow-hidden rounded-lg bg-white shadow dark:bg-zinc-900">
        <ul className="divide-y divide-zinc-200 dark:divide-zinc-700">
          {appointments.map((appointment) => {
            const meta = STATUS_META[appointment.status];
            return (
              <li
                key={appointment.id}
                className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
              >
                <div>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
                      {format(appointment.startAt, "HH:mm", { locale: ru })}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${meta.badge}`}
                    >
                      {meta.label}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
                    {appointment.client.firstName}{" "}
                    {appointment.client.lastName || ""}
                    {appointment.client.phone && (
                      <span className="ml-2 text-zinc-500 dark:text-zinc-400">
                        · {appointment.client.phone}
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {appointment.service.name} ·{" "}
                    {appointment.service.durationMinutes} мин
                  </p>
                </div>
                <div className="text-left text-sm font-medium text-zinc-900 dark:text-zinc-50 sm:text-right">
                  {Number(appointment.price).toLocaleString("ru-RU")} ₽
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
