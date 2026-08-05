import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format, addDays, startOfDay, addMinutes } from "date-fns";
import { ru } from "date-fns/locale";

export default async function SelectTimePage(
  props: {
    params: Promise<{ branchId: string; serviceId: string; employeeId: string }>;
    searchParams: Promise<{ date?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const employee = await prisma.employee.findUnique({
    where: { id: params.employeeId },
    include: { user: true, branch: true },
  });

  const service = await prisma.service.findUnique({
    where: { id: params.serviceId },
  });

  if (!employee || !service) {
    notFound();
  }

  // Выбранная дата или сегодня
  const selectedDate = searchParams.date
    ? new Date(searchParams.date)
    : new Date();
  const dayStart = startOfDay(selectedDate);

  // Генерируем слоты на 7 дней вперёд
  const days = Array.from({ length: 7 }, (_, i) => addDays(dayStart, i));

  // Получаем занятые слоты на выбранную дату
  const busyAppointments = await prisma.appointment.findMany({
    where: {
      employeeId: params.employeeId,
      startAt: {
        gte: dayStart,
        lt: addDays(dayStart, 1),
      },
      status: { notIn: ["CANCELLED", "NO_SHOW"] },
    },
    select: { startAt: true, endAt: true },
  });

  // Генерируем доступные слоты (9:00 - 20:00, шаг 30 мин)
  const generateSlots = (date: Date) => {
    const slots: Date[] = [];
    const dayStart = new Date(date);
    dayStart.setHours(9, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(20, 0, 0, 0);

    let current = dayStart;
    while (current < dayEnd) {
      const slotEnd = addMinutes(current, service.durationMinutes);
      
      // Проверяем, не занят ли слот
      const isBusy = busyAppointments.some(
        (app) =>
          (current >= app.startAt && current < app.endAt) ||
          (slotEnd > app.startAt && slotEnd <= app.endAt) ||
          (current <= app.startAt && slotEnd >= app.endAt)
      );

      if (!isBusy && slotEnd <= dayEnd) {
        slots.push(new Date(current));
      }

      current = addMinutes(current, 30);
    }
    return slots;
  };

  const availableSlots = generateSlots(selectedDate);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="mb-4">
            <Link
              href={`/book/${params.branchId}/service/${params.serviceId}`}
              className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
            >
              ← Назад к мастерам
            </Link>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            {employee.user.firstName} {employee.user.lastName}
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {service.name} • {service.durationMinutes} минут •{" "}
            {Number(service.price).toLocaleString("ru-RU")} ₽
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Выбор даты */}
        <div className="mb-8">
          <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
            Выберите дату
          </h2>
          <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
            {days.map((day) => {
              const dateStr = format(day, "yyyy-MM-dd");
              const isSelected =
                format(selectedDate, "yyyy-MM-dd") === dateStr;
              return (
                <Link
                  key={dateStr}
                  href={`/book/${params.branchId}/service/${params.serviceId}/master/${params.employeeId}?date=${dateStr}`}
                  className={`flex flex-col items-center rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
                    isSelected
                      ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900"
                      : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                  }`}
                >
                  <span className="text-xs uppercase">
                    {format(day, "EEEEEE", { locale: ru })}
                  </span>
                  <span className="mt-1 text-lg font-semibold">
                    {format(day, "d")}
                  </span>
                  <span className="text-xs">
                    {format(day, "MMMM", { locale: ru })}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Выбор времени */}
        <div>
          <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
            Выберите время на {format(selectedDate, "d MMMM", { locale: ru })}
          </h2>
          {availableSlots.length === 0 ? (
            <div className="mt-4 text-center text-zinc-500 dark:text-zinc-400">
              <p>На эту дату нет свободных окон.</p>
              <p className="mt-1 text-sm">Попробуйте выбрать другую дату.</p>
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
              {availableSlots.map((slot) => (
                <Link
                  key={slot.toISOString()}
                  href={`/book/${params.branchId}/service/${params.serviceId}/master/${params.employeeId}/confirm?time=${slot.toISOString()}`}
                  className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-center text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  {format(slot, "HH:mm")}
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
