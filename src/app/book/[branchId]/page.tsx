import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function BookPage({
  params,
}: {
  params: { branchId: string };
}) {
  const branch = await prisma.branch.findUnique({
    where: { id: params.branchId },
    include: { company: true },
  });

  if (!branch) {
    notFound();
  }

  const services = await prisma.service.findMany({
    where: { branchId: branch.id, isActive: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            {branch.company.name}
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {branch.name} {branch.address && `• ${branch.address}`}
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
          Выберите услугу
        </h2>

        <div className="mt-6 space-y-4">
          {services.map((service) => (
            <Link
              key={service.id}
              href={`/book/${branch.id}/service/${service.id}`}
              className="block rounded-lg border border-zinc-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
                    {service.name}
                  </h3>
                  {service.description && (
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                      {service.description}
                    </p>
                  )}
                  <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                    {service.durationMinutes} минут
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                    {Number(service.price).toLocaleString("ru-RU")} ₽
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {services.length === 0 && (
          <div className="mt-8 text-center text-zinc-500 dark:text-zinc-400">
            <p>В этом филиале пока нет доступных услуг.</p>
          </div>
        )}
      </main>
    </div>
  );
}
