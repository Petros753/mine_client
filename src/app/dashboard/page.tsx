import { getDashboardMetrics } from "@/lib/dashboard";
import { MetricCard } from "@/components/metric-card";

// Временно: берём первый филиал для демо. Позже — из сессии пользователя.
async function getFirstBranchId(): Promise<string | null> {
  const { prisma } = await import("@/lib/prisma");
  const branch = await prisma.branch.findFirst({ select: { id: true } });
  return branch?.id ?? null;
}

export default async function DashboardPage() {
  const branchId = await getFirstBranchId();

  if (!branchId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            Нет филиалов
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Создайте первый филиал, чтобы увидеть дашборд.
          </p>
        </div>
      </div>
    );
  }

  const metrics = await getDashboardMetrics(branchId);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Дашборд
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Ключевые показатели за сегодня
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
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
