"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { isAppointmentStatus, isTransitionAllowed } from "@/lib/appointments";
import { notifyClient } from "@/lib/notifications";
import { requireAdminCompanyId } from "@/lib/tenant";

/**
 * Смена статуса записи из журнала.
 *
 * Server Action вызывается обычным POST-запросом, поэтому все параметры
 * из формы считаем недоверенными и проверяем переход по таблице статусов.
 */
export async function updateAppointmentStatus(formData: FormData) {
  // Server Action доступен по прямому POST, поэтому проверяем сессию здесь,
  // а не полагаемся на защиту страницы в proxy
  const companyId = await requireAdminCompanyId();

  const appointmentId = String(formData.get("appointmentId") ?? "");
  const nextStatus = String(formData.get("status") ?? "");

  if (!appointmentId || !isAppointmentStatus(nextStatus)) {
    throw new Error("Некорректные параметры смены статуса");
  }

  // Ищем запись сразу в рамках компании: id приходит из формы, и чужую
  // запись менять нельзя
  const appointment = await prisma.appointment.findFirst({
    where: { id: appointmentId, branch: { companyId } },
    select: { id: true, status: true },
  });

  if (!appointment) {
    throw new Error("Запись не найдена");
  }

  // Повторный клик по той же кнопке ничего не меняет
  if (appointment.status === nextStatus) {
    return;
  }

  if (!isTransitionAllowed(appointment.status, nextStatus)) {
    throw new Error(
      `Переход ${appointment.status} → ${nextStatus} недопустим`
    );
  }

  await prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: nextStatus },
  });

  // Уведомляем клиента о смене статуса (COMPLETED и NO_SHOW — без письма)
  if (nextStatus === "CONFIRMED") {
    await notifyClient(appointmentId, "confirmed");
  } else if (nextStatus === "CANCELLED") {
    await notifyClient(appointmentId, "cancelled");
  }

  revalidatePath("/admin/appointments");
  revalidatePath("/dashboard");
}
