"use server";

import { addMinutes } from "date-fns";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { isAppointmentStatus, isTransitionAllowed } from "@/lib/appointments";
import { notifyClient } from "@/lib/notifications";
import { requireAdminCompanyId } from "@/lib/tenant";

/** Пути, которые показывают записи и метрики по ним */
function revalidateAppointmentViews() {
  revalidatePath("/admin");
  revalidatePath("/admin/appointments");
  revalidatePath("/my-appointments");
  revalidatePath("/dashboard");
}

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
    select: { id: true, status: true, serviceId: true, branchId: true },
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

  // При завершении визита списываем материалы со склада по тех.карте
  // услуги. Отдельный шаг: не хочется, чтобы сбой списания откатывал
  // саму смену статуса — мастер уже оказал услугу.
  if (nextStatus === "COMPLETED") {
    await consumeIngredients(
      appointment.id,
      appointment.serviceId,
      appointment.branchId
    );
  }

  // Уведомляем клиента о смене статуса (COMPLETED и NO_SHOW — без письма)
  if (nextStatus === "CONFIRMED") {
    await notifyClient(appointmentId, "confirmed");
  } else if (nextStatus === "CANCELLED") {
    await notifyClient(appointmentId, "cancelled");
  }

  revalidateAppointmentViews();
}

/**
 * Списание материалов по тех.карте услуги при завершении визита.
 *
 * Пишем строки CONSUMPTION с отрицательным количеством и одновременно
 * уменьшаем InventoryItem.quantity. Всё внутри prisma.$transaction —
 * иначе журнал и остаток могут разъехаться.
 *
 * Отрицательный остаток допускаем сознательно: услуга уже оказана, а
 * минусовой остаток — сигнал администратору, что пора закупать.
 */
async function consumeIngredients(
  appointmentId: string,
  serviceId: string,
  branchId: string
): Promise<void> {
  const ingredients = await prisma.serviceIngredient.findMany({
    where: {
      serviceId,
      // Материалы из другого филиала списывать нельзя — тех.карту привязали
      // к филиалу услуги, но подстраховываемся, если данные разошлись.
      // Склад товара внутри филиала не важен: любой склад филиала подходит.
      inventoryItem: { warehouse: { branchId } },
    },
    select: { inventoryItemId: true, quantityUsed: true },
  });

  if (ingredients.length === 0) return;

  await prisma.$transaction([
    prisma.inventoryTransaction.createMany({
      data: ingredients.map((ing) => ({
        inventoryItemId: ing.inventoryItemId,
        branchId,
        type: "CONSUMPTION" as const,
        // Списание — со знаком минус: сумма quantity по журналу тогда
        // сходится с текущим остатком
        quantity: ing.quantityUsed.negated(),
        appointmentId,
      })),
    }),
    ...ingredients.map((ing) =>
      prisma.inventoryItem.update({
        where: { id: ing.inventoryItemId },
        data: { quantity: { decrement: ing.quantityUsed } },
      })
    ),
  ]);
}

export interface CreateAppointmentState {
  error?: string;
  ok?: boolean;
}

/**
 * Создание записи администратором из календаря.
 *
 * Всё, что пришло из формы, — недоверенный ввод: филиал, мастера и услугу
 * проверяем на принадлежность компании, длительность и цену берём из услуги,
 * а не из формы, и не даём поставить запись поверх уже занятого времени.
 */
export async function createAppointment(
  _prevState: CreateAppointmentState,
  formData: FormData
): Promise<CreateAppointmentState> {
  const companyId = await requireAdminCompanyId();

  const branchId = String(formData.get("branchId") ?? "");
  const employeeId = String(formData.get("employeeId") ?? "");
  const serviceId = String(formData.get("serviceId") ?? "");
  const startAtRaw = String(formData.get("startAt") ?? "");
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const comment = String(formData.get("comment") ?? "").trim();

  if (!branchId || !employeeId || !serviceId || !startAtRaw) {
    return { error: "Заполните услугу, мастера и время" };
  }
  if (!firstName || !phone) {
    return { error: "Укажите имя и телефон клиента" };
  }

  // Строка вида 2026-08-06T10:30 разбирается в локальное время сервера —
  // в том же поясе, в котором построена сетка календаря
  const startAt = new Date(startAtRaw);
  if (Number.isNaN(startAt.getTime())) {
    return { error: "Некорректное время записи" };
  }

  const [employee, service] = await Promise.all([
    prisma.employee.findFirst({
      where: { id: employeeId, branchId, branch: { companyId } },
      select: { id: true },
    }),
    prisma.service.findFirst({
      where: { id: serviceId, branchId, branch: { companyId } },
      select: { id: true, durationMinutes: true, price: true },
    }),
  ]);

  if (!employee) {
    return { error: "Мастер не найден в этом филиале" };
  }
  if (!service) {
    return { error: "Услуга не найдена в этом филиале" };
  }

  // Мастер должен оказывать эту услугу — то же правило, что и в публичном
  // виджете. Фильтр в диалоге это лишь подсказка, решает проверка здесь.
  const performsService = await prisma.employeeService.findUnique({
    where: {
      employeeId_serviceId: { employeeId: employee.id, serviceId: service.id },
    },
    select: { employeeId: true },
  });

  if (!performsService) {
    return { error: "Мастер не оказывает эту услугу" };
  }

  const endAt = addMinutes(startAt, service.durationMinutes);

  // Занятым считаем время активных записей: отменённые и неявки не мешают
  const conflict = await prisma.appointment.findFirst({
    where: {
      employeeId: employee.id,
      status: { notIn: ["CANCELLED", "NO_SHOW"] },
      startAt: { lt: endAt },
      endAt: { gt: startAt },
    },
    select: { id: true },
  });

  if (conflict) {
    return { error: "У мастера уже есть запись на это время" };
  }

  // Клиента ищем по телефону в пределах филиала — как в публичном виджете
  let client = await prisma.client.findFirst({ where: { branchId, phone } });
  if (!client) {
    client = await prisma.client.create({
      data: {
        branchId,
        firstName,
        lastName: lastName || null,
        phone,
        email: email || null,
      },
    });
  }

  const appointment = await prisma.appointment.create({
    data: {
      branchId,
      clientId: client.id,
      employeeId: employee.id,
      serviceId: service.id,
      startAt,
      endAt,
      // Цену фиксируем на момент записи, как и в остальных сценариях
      price: service.price,
      status: "PENDING",
      source: "ADMIN",
      clientComment: comment || null,
    },
  });

  // Та же цепочка уведомлений, что и у записи из виджета
  await notifyClient(appointment.id, "created");

  revalidateAppointmentViews();

  return { ok: true };
}
