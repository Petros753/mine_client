import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay } from "date-fns";

export interface DashboardMetrics {
  todayAppointments: number;
  todayRevenue: number;
  upcomingAppointments: number;
  freeSlotsToday: number;
  totalClients: number;
  totalEmployees: number;
}

export async function getDashboardMetrics(
  branchId: string
): Promise<DashboardMetrics> {
  const today = new Date();
  const dayStart = startOfDay(today);
  const dayEnd = endOfDay(today);

  const [
    todayAppointments,
    todayRevenueResult,
    upcomingAppointments,
    totalClients,
    totalEmployees,
  ] = await Promise.all([
    // Записи на сегодня
    prisma.appointment.count({
      where: {
        branchId,
        startAt: { gte: dayStart, lte: dayEnd },
        status: { notIn: ["CANCELLED", "NO_SHOW"] },
      },
    }),
    // Выручка за сегодня (по завершённым и подтверждённым)
    prisma.appointment.aggregate({
      where: {
        branchId,
        startAt: { gte: dayStart, lte: dayEnd },
        status: { in: ["CONFIRMED", "COMPLETED"] },
      },
      _sum: { price: true },
    }),
    // Ближайшие записи (следующие 7 дней)
    prisma.appointment.count({
      where: {
        branchId,
        startAt: { gte: today, lte: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000) },
        status: { in: ["PENDING", "CONFIRMED"] },
      },
    }),
    // Всего клиентов филиала
    prisma.client.count({ where: { branchId } }),
    // Всего сотрудников филиала
    prisma.employee.count({ where: { branchId, isBookable: true } }),
  ]);

  // Свободные окна: упрощённо — считаем слоты по 30 мин с 9:00 до 21:00
  // минус занятые записи. В реальности нужно учитывать график работы.
  const workHours = 12; // 9:00–21:00
  const slotsPerHour = 2;
  const totalSlots = workHours * slotsPerHour * Math.max(totalEmployees, 1);
  const busySlots = await prisma.appointment.count({
    where: {
      branchId,
      startAt: { gte: dayStart, lte: dayEnd },
      status: { notIn: ["CANCELLED", "NO_SHOW"] },
    },
  });
  const freeSlotsToday = Math.max(totalSlots - busySlots, 0);

  return {
    todayAppointments,
    todayRevenue: Number(todayRevenueResult._sum.price ?? 0),
    upcomingAppointments,
    freeSlotsToday,
    totalClients,
    totalEmployees,
  };
}
