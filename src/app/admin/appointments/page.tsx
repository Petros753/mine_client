import Link from "next/link";
import Form from "next/form";
import { format, isSameDay } from "date-fns";
import { ru } from "date-fns/locale";
import { prisma } from "@/lib/prisma";
import {
  APPOINTMENT_STATUSES,
  DATE_FILTERS,
  DATE_FILTER_LABELS,
  STATUS_META,
  availableActions,
  getBranchAppointments,
  getStatusCounts,
  isAppointmentStatus,
  isDateFilter,
  type AppointmentWithRelations,
  type DateFilter,
} from "@/lib/appointments";
import {
  NO_BRANCHES_HINT,
  getCompanyBranches,
  requireAdminCompanyId,
  resolveBranchId,
} from "@/lib/tenant";
import { updateAppointmentStatus } from "./actions";

export const metadata = {
  title: "Журнал записей",
};

const selectClassName =
  "mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50";

const labelClassName =
  "block text-sm font-medium text-zinc-700 dark:text-zinc-300";

export default async function AppointmentsPage({
  searchParams,
}: PageProps<"/admin/appointments">) {
  const query = await searchParams;

  const first = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;

  const companyId = await requireAdminCompanyId();
  const branches = await getCompanyBranches(companyId);
  const branchId = resolveBranchId(branches, first(query.branchId));

  if (!branchId) {
    return <EmptyShell {...NO_BRANCHES_HINT} />;
  }

  const dateParam = first(query.date);
  const date: DateFilter = isDateFilter(dateParam) ? dateParam : "today";

  const statusParam = first(query.status);
  const status = isAppointmentStatus(statusParam) ? statusParam : undefined;

  const employees = await prisma.employee.findMany({
    where: { branchId },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });

  const employeeParam = first(query.employeeId);
  const employeeId = employees.find(
    (employee) => employee.id === employeeParam
  )?.id;

  const filters = { branchId, date, employeeId, status };
  const [appointments, statusCounts] = await Promise.all([
    getBranchAppointments(filters),
    getStatusCounts(filters),
  ]);

  // Ссылка на ту же страницу с изменённой частью фильтров
  const hrefWith = (overrides: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged: Record<string, string | undefined> = {
      branchId,
      date,
      employeeId,
      status,
      ...overrides,
    };
    for (const [key, value] of Object.entries(merged)) {
      if (value) params.set(key, value);
    }
    return `/admin/appointments?${params.toString()}`;
  };

  const totalShown = appointments.length;
  const days = groupByDay(appointments);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Журнал записей
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Все записи филиала: подтверждение, отмена, завершение
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link
            href="/admin"
            className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
          >
            ← Назад в админку
          </Link>
        </div>

        {/* Быстрые фильтры по дате */}
        <div className="mb-4 flex flex-wrap gap-2">
          {DATE_FILTERS.map((value) => (
            <Link
              key={value}
              href={hrefWith({ date: value })}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                value === date
                  ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                  : "border border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              }`}
            >
              {DATE_FILTER_LABELS[value]}
            </Link>
          ))}
        </div>

        {/* Фильтры по филиалу, мастеру и статусу */}
        <Form
          action="/admin/appointments"
          className="mb-6 rounded-lg bg-white p-4 shadow dark:bg-zinc-900"
        >
          <input type="hidden" name="date" value={date} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="branchId" className={labelClassName}>
                Филиал
              </label>
              <select
                id="branchId"
                name="branchId"
                defaultValue={branchId}
                className={selectClassName}
              >
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="employeeId" className={labelClassName}>
                Мастер
              </label>
              <select
                id="employeeId"
                name="employeeId"
                defaultValue={employeeId ?? ""}
                className={selectClassName}
              >
                <option value="">Все мастера</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.user.firstName} {employee.user.lastName ?? ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="status" className={labelClassName}>
                Статус
              </label>
              <select
                id="status"
                name="status"
                defaultValue={status ?? ""}
                className={selectClassName}
              >
                <option value="">Все статусы</option>
                {APPOINTMENT_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {STATUS_META[value].label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 flex gap-3">
            <button
              type="submit"
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Применить
            </button>
            <Link
              href="/admin/appointments"
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Сбросить
            </Link>
          </div>
        </Form>

        {/* Сводка по статусам за выбранный период */}
        <div className="mb-6 flex flex-wrap gap-2">
          {APPOINTMENT_STATUSES.map((value) => (
            <Link
              key={value}
              href={hrefWith({ status: status === value ? undefined : value })}
              className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium ${
                STATUS_META[value].badge
              } ${status === value ? "outline outline-2 outline-offset-2 outline-zinc-400 dark:outline-zinc-500" : ""}`}
            >
              {STATUS_META[value].label}
              <span className="font-semibold">{statusCounts[value]}</span>
            </Link>
          ))}
        </div>

        {totalShown === 0 ? (
          <div className="rounded-lg bg-white py-12 text-center shadow dark:bg-zinc-900">
            <p className="text-zinc-600 dark:text-zinc-400">
              За выбранный период записей нет.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {days.map(({ day, items }) => (
              <section key={day.toISOString()}>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  {format(day, "EEEE, d MMMM yyyy", { locale: ru })}
                  <span className="ml-2 font-normal normal-case tracking-normal">
                    · {items.length}{" "}
                    {pluralizeAppointments(items.length)}
                  </span>
                </h2>
                <ul className="space-y-3">
                  {items.map((appointment) => (
                    <AppointmentCard
                      key={appointment.id}
                      appointment={appointment}
                    />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function AppointmentCard({
  appointment,
}: {
  appointment: AppointmentWithRelations;
}) {
  const meta = STATUS_META[appointment.status];
  const actions = availableActions(appointment.status);
  const client = appointment.client;
  const master = appointment.employee.user;

  return (
    <li className="flex overflow-hidden rounded-lg bg-white shadow dark:bg-zinc-900">
      <div className={`w-1.5 shrink-0 ${meta.accent}`} aria-hidden="true" />
      <div className="flex-1 p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-lg font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                {format(appointment.startAt, "HH:mm")}–
                {format(appointment.endAt, "HH:mm")}
              </span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${meta.badge}`}
              >
                {meta.label}
              </span>
            </div>

            <p className="mt-2 truncate text-base font-medium text-zinc-900 dark:text-zinc-50">
              {client.firstName} {client.lastName ?? ""}
            </p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {client.phone}
              {client.email ? ` · ${client.email}` : ""}
            </p>

            <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
              <div className="flex gap-2">
                <dt className="text-zinc-500 dark:text-zinc-400">Услуга:</dt>
                <dd className="text-zinc-900 dark:text-zinc-200">
                  {appointment.service.name} ·{" "}
                  {appointment.service.durationMinutes} мин
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-zinc-500 dark:text-zinc-400">Мастер:</dt>
                <dd className="text-zinc-900 dark:text-zinc-200">
                  {master.firstName} {master.lastName ?? ""}
                </dd>
              </div>
            </dl>

            {appointment.clientComment && (
              <p className="mt-3 rounded-md bg-zinc-50 px-3 py-2 text-sm text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                <span className="text-zinc-500 dark:text-zinc-400">
                  Комментарий:{" "}
                </span>
                {appointment.clientComment}
              </p>
            )}
          </div>

          <div className="flex shrink-0 flex-col items-start gap-3 sm:items-end">
            <span className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
              {Number(appointment.price).toLocaleString("ru-RU")} ₽
            </span>

            {actions.length > 0 && (
              <div className="flex flex-wrap gap-2 sm:justify-end">
                {actions.map((action) => (
                  <form key={action.to} action={updateAppointmentStatus}>
                    <input
                      type="hidden"
                      name="appointmentId"
                      value={appointment.id}
                    />
                    <input type="hidden" name="status" value={action.to} />
                    <button
                      type="submit"
                      className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${action.className}`}
                    >
                      {action.label}
                    </button>
                  </form>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}

function EmptyShell({
  title,
  description,
  actionHref,
  actionLabel,
}: {
  title: string;
  description: string;
  actionHref: string;
  actionLabel: string;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          {title}
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">{description}</p>
        <Link
          href={actionHref}
          className="mt-6 inline-block rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {actionLabel}
        </Link>
      </div>
    </div>
  );
}

/** Группировка записей по дням — записи уже отсортированы по времени */
function groupByDay(appointments: AppointmentWithRelations[]) {
  const days: { day: Date; items: AppointmentWithRelations[] }[] = [];

  for (const appointment of appointments) {
    const last = days.at(-1);
    if (last && isSameDay(last.day, appointment.startAt)) {
      last.items.push(appointment);
    } else {
      days.push({ day: appointment.startAt, items: [appointment] });
    }
  }

  return days;
}

function pluralizeAppointments(count: number) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return "запись";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "записи";
  return "записей";
}
