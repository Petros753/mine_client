import { addMinutes, subMinutes } from "date-fns";
import type { NotificationStatus, NotificationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { notifyClient, type AppointmentEvent } from "@/lib/notifications";

/**
 * Полуширина окна поиска в минутах.
 *
 * Крон дёргают снаружи и не каждую минуту, поэтому «ровно через 24 часа» не
 * поймать. Берём записи, попадающие в ±15 минут от целевого момента: при
 * запуске раз в 15–30 минут ни одна не проскочит мимо, а повторную отправку
 * не даст проверка уже созданных уведомлений.
 */
export const REMINDER_WINDOW_MINUTES = 15;

/** Уведомление считается уже обработанным в этих статусах */
const HANDLED_STATUSES: NotificationStatus[] = ["SENT", "SCHEDULED"];

export type ReminderEvent = Extract<
  AppointmentEvent,
  "reminder24h" | "reminder2h"
>;

export interface ReminderRule {
  event: ReminderEvent;
  type: NotificationType;
  /** За сколько минут до визита шлём напоминание */
  leadMinutes: number;
}

export const REMINDER_RULES: ReminderRule[] = [
  { event: "reminder24h", type: "REMINDER_24H", leadMinutes: 24 * 60 },
  { event: "reminder2h", type: "REMINDER_2H", leadMinutes: 2 * 60 },
];

/**
 * Записи, которым пора отправить напоминание по этому правилу.
 *
 * Условия: визит подтверждён, попадает в окно, у клиента есть email и по
 * этой записи ещё нет уведомления такого типа в статусе SENT или SCHEDULED.
 * FAILED намеренно не считается обработанным — такую отправку повторим,
 * пока запись не выйдет из окна.
 */
export async function findAppointmentsDueFor(
  rule: ReminderRule,
  now: Date = new Date(),
  windowMinutes: number = REMINDER_WINDOW_MINUTES
): Promise<string[]> {
  const target = addMinutes(now, rule.leadMinutes);

  const appointments = await prisma.appointment.findMany({
    where: {
      status: "CONFIRMED",
      startAt: {
        gte: subMinutes(target, windowMinutes),
        lte: addMinutes(target, windowMinutes),
      },
      // Без email напоминать некуда: иначе такие записи всплывали бы
      // в каждом запуске и зря дёргали отправку
      client: { email: { not: null } },
      notifications: {
        none: { type: rule.type, status: { in: HANDLED_STATUSES } },
      },
    },
    select: { id: true },
    orderBy: { startAt: "asc" },
  });

  return appointments.map((appointment) => appointment.id);
}

export interface ReminderRunResult {
  /** Сколько записей попало в окно и ещё не было уведомлено */
  due: number;
  /** Письмо реально ушло */
  sent: number;
  /** Отправки не было: не настроен RESEND_API_KEY (локальная разработка) */
  queued: number;
  /** Почтовый провайдер вернул ошибку — повторим на следующем запуске */
  failed: number;
}

export type ReminderRunSummary = Record<ReminderEvent, ReminderRunResult>;

function emptyResult(): ReminderRunResult {
  return { due: 0, sent: 0, queued: 0, failed: 0 };
}

/** Обрабатывает все правила напоминаний. Вызывается из cron-эндпоинта. */
export async function sendDueReminders(
  now: Date = new Date()
): Promise<ReminderRunSummary> {
  const summary = {} as ReminderRunSummary;

  for (const rule of REMINDER_RULES) {
    const result = emptyResult();
    const appointmentIds = await findAppointmentsDueFor(rule, now);
    result.due = appointmentIds.length;

    // Последовательно: параллельная отправка ничего не ускорит на объёмах
    // одного салона, зато сделает всплеск запросов к почтовому провайдеру
    for (const appointmentId of appointmentIds) {
      const status = await notifyClient(appointmentId, rule.event);

      if (status === "SENT") result.sent += 1;
      else if (status === "SCHEDULED") result.queued += 1;
      else if (status === "FAILED") result.failed += 1;
    }

    summary[rule.event] = result;
  }

  return summary;
}
