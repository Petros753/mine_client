// Модуль чистый: сюда нельзя тащить prisma и всё, что её импортирует, —
// эти типы и константы используются клиентскими компонентами календаря.
// Запросы к базе живут в calendar-data.ts.
import { format, parse, startOfDay } from "date-fns";
import type { AppointmentStatus } from "@prisma/client";

// -----------------------------------------------------
// Сетка рабочего дня
// -----------------------------------------------------

export const DAY_START_HOUR = 9;
export const DAY_END_HOUR = 22;
export const SLOT_MINUTES = 30;
export const SLOT_HEIGHT_PX = 48;

export const DAY_START_MINUTES = DAY_START_HOUR * 60;
export const DAY_END_MINUTES = DAY_END_HOUR * 60;
export const SLOT_COUNT = (DAY_END_MINUTES - DAY_START_MINUTES) / SLOT_MINUTES;

/** Подписи слотов шкалы времени: 09:00, 09:30, … 21:30 */
export const SLOT_LABELS = Array.from({ length: SLOT_COUNT }, (_, index) => {
  const minutes = DAY_START_MINUTES + index * SLOT_MINUTES;
  const hours = Math.floor(minutes / 60);
  return `${String(hours).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
});

/** Смещение в пикселях от начала сетки для момента времени в минутах от полуночи */
export function minutesToOffset(minutes: number): number {
  return ((minutes - DAY_START_MINUTES) / SLOT_MINUTES) * SLOT_HEIGHT_PX;
}

// -----------------------------------------------------
// Параметры вида из URL
// -----------------------------------------------------

export const CALENDAR_VIEWS = ["day", "week"] as const;
export type CalendarView = (typeof CALENDAR_VIEWS)[number];

export const DATE_PARAM_FORMAT = "yyyy-MM-dd";

export function parseCalendarDate(value: string | undefined): Date {
  if (value) {
    const parsed = parse(value, DATE_PARAM_FORMAT, new Date());
    if (!Number.isNaN(parsed.getTime())) {
      return startOfDay(parsed);
    }
  }
  return startOfDay(new Date());
}

export function parseCalendarView(value: string | undefined): CalendarView {
  return (CALENDAR_VIEWS as readonly string[]).includes(value ?? "")
    ? (value as CalendarView)
    : "day";
}

export function formatDateParam(date: Date): string {
  return format(date, DATE_PARAM_FORMAT);
}

// -----------------------------------------------------
// Данные для календаря
// -----------------------------------------------------

/**
 * Запись в виде, пригодном для клиентского компонента.
 *
 * Время заранее посчитано на сервере в минутах от полуночи: так сетка не
 * разъедется, если часовой пояс браузера отличается от серверного, и не
 * нужно тащить в клиент Date и Prisma.Decimal.
 */
/** Действие смены статуса, посчитанное на сервере */
export interface CalendarAction {
  to: AppointmentStatus;
  label: string;
}

export interface CalendarAppointment {
  id: string;
  employeeId: string;
  employeeName: string;
  /** yyyy-MM-dd — для раскладки по колонкам в недельном виде */
  dayKey: string;
  startMinutes: number;
  endMinutes: number;
  timeLabel: string;
  status: AppointmentStatus;
  statusLabel: string;
  price: number;
  clientName: string;
  clientPhone: string;
  clientEmail: string | null;
  serviceName: string;
  serviceDurationMinutes: number;
  comment: string | null;
  /** Допустимые переходы статуса — считаются на сервере по таблице переходов */
  actions: CalendarAction[];
}

export interface CalendarEmployee {
  id: string;
  name: string;
  position: string | null;
  /** Услуги, которые мастер оказывает (EmployeeService) */
  serviceIds: string[];
}

export interface CalendarService {
  id: string;
  name: string;
  durationMinutes: number;
  price: number;
}

// -----------------------------------------------------
// Оформление блоков записи
// -----------------------------------------------------

/**
 * Заливка блока в сетке. Отдельно от STATUS_META: там бейджи для светлой
 * темы журнала, а здесь плотные плашки для тёмной темы календаря.
 */
export const STATUS_BLOCK_STYLES: Record<AppointmentStatus, string> = {
  PENDING:
    "border-amber-400/60 bg-amber-400/15 text-amber-50 hover:bg-amber-400/25",
  CONFIRMED:
    "border-emerald-400/60 bg-emerald-400/15 text-emerald-50 hover:bg-emerald-400/25",
  COMPLETED:
    "border-zinc-400/50 bg-zinc-400/10 text-zinc-300 hover:bg-zinc-400/20",
  CANCELLED:
    "border-red-400/50 bg-red-400/10 text-red-200/80 hover:bg-red-400/20",
  NO_SHOW:
    "border-orange-400/60 bg-orange-400/15 text-orange-50 hover:bg-orange-400/25",
};

/** Точка-индикатор статуса в списках и диалогах */
export const STATUS_DOT_STYLES: Record<AppointmentStatus, string> = {
  PENDING: "bg-amber-400",
  CONFIRMED: "bg-emerald-400",
  COMPLETED: "bg-zinc-400",
  CANCELLED: "bg-red-400",
  NO_SHOW: "bg-orange-400",
};

// -----------------------------------------------------
// Раскладка пересекающихся записей
// -----------------------------------------------------

export interface PositionedAppointment {
  appointment: CalendarAppointment;
  /** Порядковый номер колонки внутри группы пересечений */
  lane: number;
  /** Сколько всего колонок в группе */
  lanes: number;
}

/**
 * Раскладывает записи по «дорожкам», чтобы пересекающиеся по времени
 * не перекрывали друг друга, а вставали рядом.
 */
export function layoutAppointments(
  appointments: CalendarAppointment[]
): PositionedAppointment[] {
  const sorted = [...appointments].sort(
    (a, b) => a.startMinutes - b.startMinutes || a.endMinutes - b.endMinutes
  );

  const result: PositionedAppointment[] = [];
  let group: PositionedAppointment[] = [];
  let groupEnd = -1;

  const flush = () => {
    const lanes = group.reduce((max, item) => Math.max(max, item.lane + 1), 0);
    for (const item of group) {
      item.lanes = lanes;
      result.push(item);
    }
    group = [];
    groupEnd = -1;
  };

  for (const appointment of sorted) {
    // Запись не пересекается ни с чем в текущей группе — группа закрыта
    if (group.length > 0 && appointment.startMinutes >= groupEnd) {
      flush();
    }

    // Ищем первую свободную дорожку внутри группы
    const busy = new Set(
      group
        .filter((item) => item.appointment.endMinutes > appointment.startMinutes)
        .map((item) => item.lane)
    );
    let lane = 0;
    while (busy.has(lane)) lane += 1;

    group.push({ appointment, lane, lanes: 1 });
    groupEnd = Math.max(groupEnd, appointment.endMinutes);
  }

  if (group.length > 0) flush();

  return result;
}
