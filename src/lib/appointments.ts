import { prisma } from "@/lib/prisma";
import type { AppointmentStatus } from "@prisma/client";
import { addDays, endOfDay, startOfDay } from "date-fns";

// -----------------------------------------------------
// Статусы записи: подписи и цветовая индикация
// -----------------------------------------------------

export interface StatusMeta {
  label: string;
  /** Классы бейджа статуса (светлая + тёмная тема) */
  badge: string;
  /** Классы цветной полосы слева от карточки */
  accent: string;
}

export const STATUS_META: Record<AppointmentStatus, StatusMeta> = {
  PENDING: {
    label: "Ожидает подтверждения",
    badge:
      "bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/30",
    accent: "bg-amber-400",
  },
  CONFIRMED: {
    label: "Подтверждена",
    badge:
      "bg-emerald-100 text-emerald-800 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/30",
    accent: "bg-emerald-500",
  },
  COMPLETED: {
    label: "Завершена",
    badge:
      "bg-zinc-100 text-zinc-700 ring-1 ring-inset ring-zinc-500/20 dark:bg-zinc-400/10 dark:text-zinc-300 dark:ring-zinc-400/30",
    accent: "bg-zinc-400",
  },
  CANCELLED: {
    label: "Отменена",
    badge:
      "bg-red-100 text-red-800 ring-1 ring-inset ring-red-600/20 dark:bg-red-400/10 dark:text-red-300 dark:ring-red-400/30",
    accent: "bg-red-500",
  },
  NO_SHOW: {
    label: "Неявка",
    badge:
      "bg-orange-100 text-orange-800 ring-1 ring-inset ring-orange-600/20 dark:bg-orange-400/10 dark:text-orange-300 dark:ring-orange-400/30",
    accent: "bg-orange-500",
  },
};

export const APPOINTMENT_STATUSES = Object.keys(
  STATUS_META
) as AppointmentStatus[];

export function isAppointmentStatus(
  value: string | undefined
): value is AppointmentStatus {
  return !!value && value in STATUS_META;
}

// -----------------------------------------------------
// Разрешённые переходы между статусами
// -----------------------------------------------------

export interface StatusAction {
  to: AppointmentStatus;
  label: string;
  /** Из каких статусов доступно это действие */
  from: AppointmentStatus[];
  /** Классы кнопки действия */
  className: string;
}

export const STATUS_ACTIONS: StatusAction[] = [
  {
    to: "CONFIRMED",
    label: "Подтвердить",
    from: ["PENDING"],
    className:
      "bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400 dark:text-emerald-950",
  },
  {
    to: "COMPLETED",
    label: "Завершить",
    from: ["CONFIRMED"],
    className:
      "bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200",
  },
  {
    to: "NO_SHOW",
    label: "Неявка",
    from: ["CONFIRMED"],
    className:
      "border border-orange-300 text-orange-700 hover:bg-orange-50 dark:border-orange-400/40 dark:text-orange-300 dark:hover:bg-orange-400/10",
  },
  {
    // «Отменить» доступно из любого статуса, кроме уже отменённого
    to: "CANCELLED",
    label: "Отменить",
    from: ["PENDING", "CONFIRMED", "COMPLETED", "NO_SHOW"],
    className:
      "border border-red-300 text-red-700 hover:bg-red-50 dark:border-red-400/40 dark:text-red-300 dark:hover:bg-red-400/10",
  },
];

export function availableActions(current: AppointmentStatus): StatusAction[] {
  return STATUS_ACTIONS.filter((action) => action.from.includes(current));
}

export function isTransitionAllowed(
  from: AppointmentStatus,
  to: AppointmentStatus
): boolean {
  return STATUS_ACTIONS.some(
    (action) => action.to === to && action.from.includes(from)
  );
}

// -----------------------------------------------------
// Фильтр по дате
// -----------------------------------------------------

export const DATE_FILTERS = ["today", "tomorrow", "week", "all"] as const;
export type DateFilter = (typeof DATE_FILTERS)[number];

export const DATE_FILTER_LABELS: Record<DateFilter, string> = {
  today: "Сегодня",
  tomorrow: "Завтра",
  week: "Неделя",
  all: "Все",
};

export function isDateFilter(value: string | undefined): value is DateFilter {
  return !!value && (DATE_FILTERS as readonly string[]).includes(value);
}

/** Границы периода для выбранного фильтра. `undefined` — без ограничения по дате. */
export function resolveDateRange(
  filter: DateFilter,
  now: Date = new Date()
): { gte: Date; lte: Date } | undefined {
  switch (filter) {
    case "today":
      return { gte: startOfDay(now), lte: endOfDay(now) };
    case "tomorrow": {
      const tomorrow = addDays(now, 1);
      return { gte: startOfDay(tomorrow), lte: endOfDay(tomorrow) };
    }
    case "week":
      return { gte: startOfDay(now), lte: endOfDay(addDays(now, 6)) };
    case "all":
      return undefined;
  }
}

// -----------------------------------------------------
// Выборка записей для журнала
// -----------------------------------------------------

export interface AppointmentFilters {
  branchId: string;
  date: DateFilter;
  employeeId?: string;
  status?: AppointmentStatus;
}

function buildWhere({
  branchId,
  date,
  employeeId,
  status,
}: AppointmentFilters) {
  const range = resolveDateRange(date);
  return {
    branchId,
    ...(range ? { startAt: range } : {}),
    ...(employeeId ? { employeeId } : {}),
    ...(status ? { status } : {}),
  };
}

export async function getBranchAppointments(filters: AppointmentFilters) {
  return prisma.appointment.findMany({
    where: buildWhere(filters),
    include: {
      client: true,
      service: true,
      employee: { include: { user: true } },
    },
    orderBy: { startAt: "asc" },
  });
}

export type AppointmentWithRelations = Awaited<
  ReturnType<typeof getBranchAppointments>
>[number];

/**
 * Счётчики по статусам для текущей выборки (без учёта фильтра по статусу —
 * иначе все остальные счётчики всегда были бы нулевыми).
 */
export async function getStatusCounts(
  filters: AppointmentFilters
): Promise<Record<AppointmentStatus, number>> {
  const grouped = await prisma.appointment.groupBy({
    by: ["status"],
    where: buildWhere({ ...filters, status: undefined }),
    _count: { _all: true },
  });

  const counts = Object.fromEntries(
    APPOINTMENT_STATUSES.map((status) => [status, 0])
  ) as Record<AppointmentStatus, number>;

  for (const row of grouped) {
    counts[row.status] = row._count._all;
  }

  return counts;
}
