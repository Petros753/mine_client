import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format, parseISO, addMinutes } from "date-fns";
import { ru } from "date-fns/locale";

async function createAppointment(formData: FormData) {
  "use server";

  const branchId = formData.get("branchId") as string;
  const serviceId = formData.get("serviceId") as string;
  const employeeId = formData.get("employeeId") as string;
  const timeStr = formData.get("time") as string;
  const firstName = formData.get("firstName") as string;
  const lastName = formData.get("lastName") as string;
  const phone = formData.get("phone") as string;
  const email = formData.get("email") as string;

  const startAt = parseISO(timeStr);
  const service = await prisma.service.findUnique({
    where: { id: serviceId },
  });

  if (!service) {
    throw new Error("Service not found");
  }

  const endAt = addMinutes(startAt, service.durationMinutes);

  // Находим или создаём клиента
  let client = await prisma.client.findFirst({
    where: { branchId, phone },
  });

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

  // Создаём запись
  await prisma.appointment.create({
    data: {
      branchId,
      clientId: client.id,
      employeeId,
      serviceId,
      startAt,
      endAt,
      status: "PENDING",
      price: service.price,
      clientComment: null,
    },
  });

  redirect(`/book/${branchId}/success`);
}

export default async function ConfirmPage({
  params,
  searchParams,
}: {
  params: { branchId: string; serviceId: string; employeeId: string };
  searchParams: { time?: string };
}) {
  if (!searchParams.time) {
    redirect(`/book/${params.branchId}/service/${params.serviceId}/master/${params.employeeId}`);
  }

  const time = parseISO(searchParams.time);
  const service = await prisma.service.findUnique({
    where: { id: params.serviceId },
  });
  const employee = await prisma.employee.findUnique({
    where: { id: params.employeeId },
    include: { user: true },
  });

  if (!service || !employee) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="mb-4">
            <Link
              href={`/book/${params.branchId}/service/${params.serviceId}/master/${params.employeeId}`}
              className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
            >
              ← Назад к выбору времени
            </Link>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Подтверждение записи
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Детали записи */}
        <div className="rounded-lg bg-white p-6 shadow dark:bg-zinc-900">
          <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
            Детали записи
          </h2>
          <dl className="mt-4 space-y-3">
            <div className="flex justify-between">
              <dt className="text-zinc-600 dark:text-zinc-400">Услуга:</dt>
              <dd className="font-medium text-zinc-900 dark:text-zinc-50">
                {service.name}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-600 dark:text-zinc-400">Мастер:</dt>
              <dd className="font-medium text-zinc-900 dark:text-zinc-50">
                {employee.user.firstName} {employee.user.lastName}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-600 dark:text-zinc-400">Дата и время:</dt>
              <dd className="font-medium text-zinc-900 dark:text-zinc-50">
                {format(time, "d MMMM yyyy, HH:mm", { locale: ru })}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-600 dark:text-zinc-400">Длительность:</dt>
              <dd className="font-medium text-zinc-900 dark:text-zinc-50">
                {service.durationMinutes} минут
              </dd>
            </div>
            <div className="flex justify-between border-t border-zinc-200 pt-3 dark:border-zinc-700">
              <dt className="text-zinc-600 dark:text-zinc-400">Стоимость:</dt>
              <dd className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                {Number(service.price).toLocaleString("ru-RU")} ₽
              </dd>
            </div>
          </dl>
        </div>

        {/* Форма контактов */}
        <form action={createAppointment} className="mt-8 space-y-6">
          <input type="hidden" name="branchId" value={params.branchId} />
          <input type="hidden" name="serviceId" value={params.serviceId} />
          <input type="hidden" name="employeeId" value={params.employeeId} />
          <input type="hidden" name="time" value={searchParams.time} />

          <div>
            <label
              htmlFor="firstName"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Имя *
            </label>
            <input
              type="text"
              id="firstName"
              name="firstName"
              required
              className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50 sm:text-sm"
              placeholder="Иван"
            />
          </div>

          <div>
            <label
              htmlFor="lastName"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Фамилия
            </label>
            <input
              type="text"
              id="lastName"
              name="lastName"
              className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50 sm:text-sm"
              placeholder="Петров"
            />
          </div>

          <div>
            <label
              htmlFor="phone"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Телефон *
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              required
              className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50 sm:text-sm"
              placeholder="+7 (999) 123-45-67"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50 sm:text-sm"
              placeholder="ivan@example.com"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-md bg-zinc-900 px-4 py-3 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Записаться
          </button>
        </form>
      </main>
    </div>
  );
}
