import Link from "next/link";
import { auth } from "@/lib/auth";
import { SignOutButton } from "@/components/sign-out-button";

export default async function AdminPage() {
  const session = await auth();

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-7xl items-start justify-between gap-4 px-4 py-6 sm:px-6 lg:px-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Админ-панель
            </h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Управление филиалами, услугами и сотрудниками
            </p>
          </div>
          {session?.user && (
            <div className="flex shrink-0 items-center gap-3">
              <span className="hidden text-sm text-zinc-600 dark:text-zinc-400 sm:inline">
                {session.user.name || session.user.email}
              </span>
              <SignOutButton />
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/admin/appointments"
            className="overflow-hidden rounded-lg bg-white shadow transition-shadow hover:shadow-md dark:bg-zinc-900"
          >
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
                Журнал записей
              </h3>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Календарь записей и смена статусов
              </p>
            </div>
          </Link>

          <Link
            href="/admin/branches"
            className="overflow-hidden rounded-lg bg-white shadow transition-shadow hover:shadow-md dark:bg-zinc-900"
          >
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
                Филиалы
              </h3>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Управление точками бизнеса
              </p>
            </div>
          </Link>

          <Link
            href="/admin/services"
            className="overflow-hidden rounded-lg bg-white shadow transition-shadow hover:shadow-md dark:bg-zinc-900"
          >
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
                Услуги
              </h3>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Управление услугами и ценами
              </p>
            </div>
          </Link>

          <Link
            href="/admin/employees"
            className="overflow-hidden rounded-lg bg-white shadow transition-shadow hover:shadow-md dark:bg-zinc-900"
          >
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
                Сотрудники
              </h3>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Управление мастерами
              </p>
            </div>
          </Link>
        </div>

        <div className="mt-8">
          <Link
            href="/dashboard"
            className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
          >
            ← Вернуться к дашборду
          </Link>
        </div>
      </main>
    </div>
  );
}
