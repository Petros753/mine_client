import { endOfDay, format, startOfDay } from "date-fns";
import { prisma } from "@/lib/prisma";
import { STATUS_META, availableActions } from "@/lib/appointments";
import {
  DATE_PARAM_FORMAT,
  type CalendarAppointment,
} from "@/lib/calendar";

function minutesOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

function fullName(firstName: string, lastName: string | null): string {
  return [firstName, lastName].filter(Boolean).join(" ");
}

/**
 * Записи филиала за произвольный интервал — для дневного и недельного вида.
 *
 * Возвращает уже подготовленные для клиента данные: время посчитано в минутах
 * от полуночи по часам сервера, Decimal сведён к number, набор действий
 * посчитан по таблице переходов.
 */
export async function getCalendarAppointments(params: {
  branchId: string;
  from: Date;
  to: Date;
  employeeId?: string;
}): Promise<CalendarAppointment[]> {
  const rows = await prisma.appointment.findMany({
    where: {
      branchId: params.branchId,
      startAt: { gte: startOfDay(params.from), lte: endOfDay(params.to) },
      ...(params.employeeId ? { employeeId: params.employeeId } : {}),
    },
    include: {
      client: true,
      service: true,
      employee: { include: { user: true } },
    },
    orderBy: { startAt: "asc" },
  });

  return rows.map((row) => ({
    id: row.id,
    employeeId: row.employeeId,
    employeeName: fullName(
      row.employee.user.firstName,
      row.employee.user.lastName
    ),
    dayKey: format(row.startAt, DATE_PARAM_FORMAT),
    startMinutes: minutesOfDay(row.startAt),
    endMinutes: minutesOfDay(row.endAt),
    timeLabel: `${format(row.startAt, "HH:mm")} – ${format(row.endAt, "HH:mm")}`,
    status: row.status,
    statusLabel: STATUS_META[row.status].label,
    price: Number(row.price),
    clientName: fullName(row.client.firstName, row.client.lastName),
    clientPhone: row.client.phone,
    clientEmail: row.client.email,
    serviceName: row.service.name,
    serviceDurationMinutes: row.service.durationMinutes,
    comment: row.clientComment,
    actions: availableActions(row.status).map((action) => ({
      to: action.to,
      label: action.label,
    })),
  }));
}
