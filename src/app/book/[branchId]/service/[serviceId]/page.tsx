import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function SelectMasterPage(
  props: {
    params: Promise<{ branchId: string; serviceId: string }>;
  }
) {
  const params = await props.params;
  const service = await prisma.service.findUnique({
    where: { id: params.serviceId },
    include: { branch: true },
  });

  if (!service) {
    notFound();
  }

  // Мастера, которые оказывают эту услугу
  const employees = await prisma.employee.findMany({
    where: {
      branchId: params.branchId,
      isBookable: true,
      services: {
        some: { serviceId: params.serviceId },
      },
    },
    include: { user: true },
    orderBy: { user: { firstName: "asc" } },
  });

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="mb-4">
            <Link
              href={`/book/${params.branchId}`}
              className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
            >
              ← Назад к услугам
            </Link>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            {service.name}
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {service.durationMinutes} минут • {Number(service.price).toLocaleString("ru-RU")} ₽
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
          Выберите мастера
        </h2>

        <div className="mt-6 space-y-4">
          {employees.map((employee) => (
            <Link
              key={employee.id}
              href={`/book/${params.branchId}/service/${params.serviceId}/master/${employee.id}`}
              className="block rounded-lg border border-zinc-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
                    {employee.user.firstName} {employee.user.lastName}
                  </h3>
                  {employee.position && (
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                      {employee.position}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <span className="inline-flex rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800 dark:bg-green-900 dark:text-green-200">
                    Доступен
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {employees.length === 0 && (
          <div className="mt-8 text-center text-zinc-500 dark:text-zinc-400">
            <p>Нет мастеров, оказывающих эту услугу.</p>
          </div>
        )}
      </main>
    </div>
  );
}
