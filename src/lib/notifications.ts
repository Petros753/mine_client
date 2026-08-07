import { format } from "date-fns";
import { ru } from "date-fns/locale";
import type { NotificationStatus, NotificationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendEmail, type EmailMessage } from "@/lib/email";

/** Событие записи, о котором уведомляем клиента */
export type AppointmentEvent =
  | "created"
  | "confirmed"
  | "cancelled"
  | "reminder24h"
  | "reminder2h";

// В схеме нет отдельного типа для «заявка принята, ждёт подтверждения»,
// поэтому и создание, и подтверждение пишем как CONFIRMATION.
const EVENT_NOTIFICATION_TYPE: Record<AppointmentEvent, NotificationType> = {
  created: "CONFIRMATION",
  confirmed: "CONFIRMATION",
  cancelled: "CANCELLATION",
  reminder24h: "REMINDER_24H",
  reminder2h: "REMINDER_2H",
};

type AppointmentForEmail = {
  id: string;
  startAt: Date;
  price: unknown;
  client: { firstName: string; email: string | null };
  service: { name: string; durationMinutes: number };
  employee: { user: { firstName: string; lastName: string | null } };
  branch: { name: string; address: string | null; phone: string | null };
};

function formatDetails(appointment: AppointmentForEmail): [string, string][] {
  const master = [
    appointment.employee.user.firstName,
    appointment.employee.user.lastName,
  ]
    .filter(Boolean)
    .join(" ");

  const details: [string, string][] = [
    ["Услуга", appointment.service.name],
    ["Мастер", master],
    [
      "Дата и время",
      format(appointment.startAt, "d MMMM yyyy, HH:mm", { locale: ru }),
    ],
    ["Длительность", `${appointment.service.durationMinutes} мин`],
    ["Стоимость", `${Number(appointment.price).toLocaleString("ru-RU")} ₽`],
    ["Филиал", appointment.branch.name],
  ];

  if (appointment.branch.address) {
    details.push(["Адрес", appointment.branch.address]);
  }
  if (appointment.branch.phone) {
    details.push(["Телефон", appointment.branch.phone]);
  }

  return details;
}

const EVENT_COPY: Record<
  AppointmentEvent,
  { subject: string; intro: string; outro: string }
> = {
  created: {
    subject: "Запись создана, ожидайте подтверждения",
    intro:
      "Мы получили вашу заявку на запись. Администратор скоро её подтвердит — " +
      "как только это произойдёт, придёт ещё одно письмо.",
    outro: "Если планы изменились, свяжитесь с нами по телефону филиала.",
  },
  confirmed: {
    subject: "Запись подтверждена",
    intro: "Ваша запись подтверждена. Ждём вас в назначенное время!",
    outro:
      "Пожалуйста, предупредите заранее, если не сможете прийти — " +
      "мы освободим время для других клиентов.",
  },
  cancelled: {
    subject: "Запись отменена",
    intro: "К сожалению, ваша запись отменена.",
    outro: "Вы всегда можете записаться на другое время — будем рады видеть вас.",
  },
  reminder24h: {
    subject: "Напоминание: запись завтра",
    intro: "Напоминаем о вашей записи — она состоится завтра.",
    outro:
      "Если планы изменились, предупредите нас по телефону филиала: " +
      "мы освободим время для других клиентов.",
  },
  reminder2h: {
    subject: "Напоминание: запись через 2 часа",
    intro: "Напоминаем о вашей записи — она уже совсем скоро.",
    outro: "Если опаздываете, позвоните нам по телефону филиала.",
  },
};

function buildMessage(
  event: AppointmentEvent,
  appointment: AppointmentForEmail,
  to: string
): EmailMessage {
  const copy = EVENT_COPY[event];
  const details = formatDetails(appointment);

  const subject = `${copy.subject} — ${appointment.service.name}, ${format(
    appointment.startAt,
    "d MMMM, HH:mm",
    { locale: ru }
  )}`;

  const text = [
    `Здравствуйте, ${appointment.client.firstName}!`,
    "",
    copy.intro,
    "",
    ...details.map(([label, value]) => `${label}: ${value}`),
    "",
    copy.outro,
  ].join("\n");

  const rows = details
    .map(
      ([label, value]) =>
        `<tr>` +
        `<td style="padding:4px 16px 4px 0;color:#71717a;">${label}</td>` +
        `<td style="padding:4px 0;color:#18181b;font-weight:500;">${value}</td>` +
        `</tr>`
    )
    .join("");

  const html =
    `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.6;color:#18181b;">` +
    `<p>Здравствуйте, ${appointment.client.firstName}!</p>` +
    `<p>${copy.intro}</p>` +
    `<table style="border-collapse:collapse;margin:16px 0;">${rows}</table>` +
    `<p style="color:#52525b;">${copy.outro}</p>` +
    `</div>`;

  return { to, subject, text, html };
}

/**
 * Отправляет клиенту письмо о событии записи и фиксирует попытку в таблице
 * notifications. Ошибки отправки не пробрасываются наверх — мутация записи
 * не должна откатываться из-за недоступной почты.
 *
 * Возвращает статус записанного уведомления или `null`, если уведомлять было
 * некого (запись не найдена или у клиента нет email). Вызовам из server
 * actions результат не нужен, а крон напоминаний по нему считает статистику.
 */
export async function notifyClient(
  appointmentId: string,
  event: AppointmentEvent
): Promise<NotificationStatus | null> {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      client: true,
      service: true,
      branch: true,
      employee: { include: { user: true } },
    },
  });

  if (!appointment) return null;

  const to = appointment.client.email;
  if (!to) {
    // Клиент не оставил email — уведомлять некуда (SMS появятся в фазе 2)
    return null;
  }

  const result = await sendEmail(buildMessage(event, appointment, to));

  // skipped — отправки не было (не настроен ключ), это не ошибка доставки
  const status: NotificationStatus = result.ok
    ? "SENT"
    : result.skipped
      ? "SCHEDULED"
      : "FAILED";

  try {
    await prisma.notification.create({
      data: {
        appointmentId: appointment.id,
        type: EVENT_NOTIFICATION_TYPE[event],
        channel: "EMAIL",
        status,
        scheduledFor: new Date(),
        sentAt: result.ok ? new Date() : null,
      },
    });
  } catch (error) {
    console.error("[notifications] Не удалось записать уведомление:", error);
  }

  return status;
}
