import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { requireCompanyId } from "@/lib/tenant";

export default async function BranchesPage() {
  const companyId = await requireCompanyId();
  const branches = await prisma.branch.findMany({
    where: { companyId },
    include: { company: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                Филиалы
              </h1>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                Управление точками вашего бизнеса
              </p>
            </div>
            <Link
              href="/admin/branches/new"
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              + Новый филиал
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
        {branches.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-zinc-600 dark:text-zinc-400">
              Пока нет филиалов. Создайте первый.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {branches.map((branch) => (
              <div
                key={branch.id}
                className="overflow-hidden rounded-lg bg-white shadow dark:bg-zinc-900"
              >
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
                    {branch.name}
                  </h3>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    {branch.company.name}
                  </p>
                  {branch.address && (
                    <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                      📍 {branch.address}
                    </p>
                  )}
                  {branch.phone && (
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                      📞 {branch.phone}
                    </p>
                  )}
                  <div className="mt-4 flex gap-2">
                    <Link
                      href={`/admin/services?branchId=${branch.id}`}
                      className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
                    >
                      Услуги →
                    </Link>
                    <Link
                      href={`/admin/employees?branchId=${branch.id}`}
                      className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
                    >
                      Сотрудники →
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
