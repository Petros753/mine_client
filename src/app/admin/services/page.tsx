import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function ServicesPage(
  props: {
    searchParams: Promise<{ branchId?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const branchId = searchParams.branchId;
  const where = branchId ? { branchId } : {};

  const services = await prisma.service.findMany({
    where,
    include: { branch: true },
    orderBy: { createdAt: "desc" },
  });

  const branches = await prisma.branch.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                Услуги
              </h1>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                Управление услугами и ценами
              </p>
            </div>
            <Link
              href={`/admin/services/new${branchId ? `?branchId=${branchId}` : ""}`}
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              + Новая услуга
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link
            href="/admin"
            className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
          >
            ← Назад в админку
          </Link>
        </div>
        {/* Фильтр по филиалу */}
        <div className="mb-6">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Филиал:
          </label>
          <div className="mt-2 flex gap-2">
            <Link
              href="/admin/services"
              className={`rounded-md px-3 py-1 text-sm ${
                !branchId
                  ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
              }`}
            >
              Все
            </Link>
            {branches.map((branch) => (
              <Link
                key={branch.id}
                href={`/admin/services?branchId=${branch.id}`}
                className={`rounded-md px-3 py-1 text-sm ${
                  branchId === branch.id
                    ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                    : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
                }`}
              >
                {branch.name}
              </Link>
            ))}
          </div>
        </div>

        {services.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-zinc-600 dark:text-zinc-400">
              Пока нет услуг. Создайте первую.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden bg-white shadow dark:bg-zinc-900 sm:rounded-md">
            <ul className="divide-y divide-zinc-200 dark:divide-zinc-700">
              {services.map((service) => (
                <li key={service.id}>
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
                          {service.name}
                        </h3>
                        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                          {service.branch.name}
                        </p>
                        {service.description && (
                          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                            {service.description}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                          {Number(service.price).toLocaleString("ru-RU")} ₽
                        </p>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                          {service.durationMinutes} мин
                        </p>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}
