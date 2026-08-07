import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { REMINDER_WINDOW_MINUTES, sendDueReminders } from "@/lib/reminders";

// Эндпоинт всегда работает по факту запроса и ничего не кэширует
export const dynamic = "force-dynamic";

/** Сравнение без утечки по времени: длина и содержимое */
function secretMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Отправка напоминаний о визитах за 24 часа и за 2 часа.
 *
 * Next.js сам по расписанию не просыпается, поэтому эндпоинт дёргает внешний
 * планировщик — см. раздел «Напоминания о записи» в README. Запускать можно
 * как угодно часто: повторные письма отсекает проверка уже созданных
 * уведомлений, так что лишний вызов ничего не испортит.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;

  // Без секрета эндпоинт был бы открыт всему интернету — лучше не отвечать
  if (!secret) {
    console.error("[cron] CRON_SECRET не задан, запрос отклонён");
    return NextResponse.json(
      { error: "CRON_SECRET не настроен на сервере" },
      { status: 500 }
    );
  }

  const authorization = request.headers.get("authorization") ?? "";
  if (!secretMatches(authorization, `Bearer ${secret}`)) {
    return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  }

  const startedAt = new Date();

  try {
    const reminders = await sendDueReminders(startedAt);

    return NextResponse.json({
      ok: true,
      processedAt: startedAt.toISOString(),
      windowMinutes: REMINDER_WINDOW_MINUTES,
      reminders,
    });
  } catch (error) {
    console.error("[cron] Не удалось разослать напоминания:", error);
    return NextResponse.json(
      { error: "Не удалось разослать напоминания" },
      { status: 500 }
    );
  }
}
