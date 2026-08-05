import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: { branchId?: string };
}) {
  const branchId = searchParams.branchId;
  const where = branchId ? { branchId } : {};

  const employees = await prisma.employee.findMany({
    where,
    include: { user: true, branch: true },
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
                Сотрудники
              </h1>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                Управление мастерами и специалистами
              </p>
            </div>
            <Link
              href={`/admin/employees/new${branchId ? `?branchId=${branchId}` : ""}`}
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              + Новый сотрудник
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
              href="/admin/employees"
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
                href={`/admin/employees?branchId=${branch.id}`}
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

        {employees.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-zinc-600 dark:text-zinc-400">
              Пока нет сотрудников. Создайте первого.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden bg-white shadow dark:bg-zinc-900 sm:rounded-md">
            <ul className="divide-y divide-zinc-200 dark:divide-zinc-700">
              {employees.map((employee) => (
                <li key={employee.id}>
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
                          {employee.user.firstName} {employee.user.lastName}
                        </h3>
                        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                          {employee.branch.name}
                          {employee.position && ` • ${employee.position}`}
                        </p>
                        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                          {employee.user.email}
                          {employee.user.phone && ` • ${employee.user.phone}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                            employee.isBookable
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                              : "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
                          }`}
                        >
                          {employee.isBookable ? "Доступен для записи" : "Не доступен"}
                        </span>
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
