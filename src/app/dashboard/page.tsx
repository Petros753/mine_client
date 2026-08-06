import Link from "next/link";
import { getDashboardMetrics } from "@/lib/dashboard";
import { MetricCard } from "@/components/metric-card";
import {
  getCompanyBranches,
  getCurrentEmployee,
  isAdminOrOwner,
  requireCompanyId,
  requireSession,
  resolveBranchId,
} from "@/lib/tenant";

export const metadata = {
  title: "Дашборд",
};

// Метрики считаются на каждый запрос: страница зависит от сессии и от данных,
// которые меняются в течение дня, — кэшировать её на этапе сборки нельзя
export const dynamic = "force-dynamic";

export default async function DashboardPage(
  props: {
    searchParams: Promise<{ branchId?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const session = await requireSession();
  const companyId = session.user.companyId;
  const canAccessAdmin = isAdminOrOwner(session);

  const employee = canAccessAdmin ? null : await getCurrentEmployee(session.user.id);
  // Мастер без профиля не может видеть ничего
  if (!canAccessAdmin && !employee) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            Профиль сотрудника не найден
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Обратитесь к администратору, чтобы вас добавили в штат.
          </p>
        </div>
      </div>
    );
  }

  const branches = await getCompanyBranches(companyId);
  // Мастер видит только свой филиал; админ/владелец — выбирают из всех
  const allowedBranchIds = employee ? [employee.branchId] : branches.map((b) => b.id);
  const requestedBranchId = searchParams.branchId;
  const branchId = employee
    ? employee.branchId
    : resolveBranchId(branches, requestedBranchId);

  if (!branchId || !allowedBranchIds.includes(branchId)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            Нет филиалов
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            {canAccessAdmin
              ? "Создайте первый филиал, чтобы увидеть дашборд."
              : "Для вас не назначен филиал."}
          </p>
          {canAccessAdmin && (
            <Link
              href="/admin/branches/new"
              className="mt-6 inline-block rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Создать филиал
            </Link>
          )}
        </div>
      </div>
    );
  }

  const metrics = await getDashboardMetrics({
    branchId,
    employeeId: employee?.id,
  });
  const currentBranch = branches.find((branch) => branch.id === branchId);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Дашборд
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {employee
              ? "Ваши показатели за сегодня"
              : "Ключевые показатели за сегодня"}
            {currentBranch ? ` · ${currentBranch.name}` : ""}
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          {canAccessAdmin ? (
            <Link
              href="/admin"
              className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
            >
              ← В админку
            </Link>
          ) : (
            <Link
              href="/my-appointments"
              className="text-sm font-medium text-zinc-900 hover:text-zinc-700 dark:text-zinc-50 dark:hover:text-zinc-300"
            >
              Мои записи →
            </Link>
          )}

          {canAccessAdmin && branches.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {branches.map((branch) => (
                <Link
                  key={branch.id}
                  href={`/dashboard?branchId=${branch.id}`}
                  className={`rounded-md px-3 py-1 text-sm ${
                    branch.id === branchId
                      ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                      : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
                  }`}
                >
                  {branch.name}
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <MetricCard
            title="Записи сегодня"
            value={metrics.todayAppointments}
            description="подтверждено и ожидает"
          />
          <MetricCard
            title="Выручка сегодня"
            value={`${metrics.todayRevenue.toLocaleString("ru-RU")} ₽`}
            description="по подтверждённым записям"
          />
          <MetricCard
            title="Свободные окна"
            value={metrics.freeSlotsToday}
            description="слотов по 30 мин на сегодня"
          />
          <MetricCard
            title="Ближайшие записи"
            value={metrics.upcomingAppointments}
            description="на следующие 7 дней"
          />
          <MetricCard
            title="Клиенты"
            value={metrics.totalClients}
            description="всего в базе филиала"
          />
          <MetricCard
            title="Сотрудники"
            value={metrics.totalEmployees}
            description="доступны для записи"
          />
        </div>
      </main>
    </div>
  );
}
