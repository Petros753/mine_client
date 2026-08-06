import Link from "next/link";
import { getDashboardMetrics } from "@/lib/dashboard";
import { MetricCard } from "@/components/metric-card";
import { Button } from "@/components/ui/button";
import {
  getCompanyBranches,
  getCurrentEmployee,
  isAdminOrOwner,
  requireSession,
  resolveBranchId,
} from "@/lib/tenant";

export const metadata = {
  title: "Дашборд",
};

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
  if (!canAccessAdmin && !employee) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-foreground">
            Профиль сотрудника не найден
          </h1>
          <p className="mt-2 text-muted-foreground">
            Обратитесь к администратору, чтобы вас добавили в штат.
          </p>
        </div>
      </div>
    );
  }

  const branches = await getCompanyBranches(companyId);
  const allowedBranchIds = employee ? [employee.branchId] : branches.map((b) => b.id);
  const requestedBranchId = searchParams.branchId;
  const branchId = employee
    ? employee.branchId
    : resolveBranchId(branches, requestedBranchId);

  if (!branchId || !allowedBranchIds.includes(branchId)) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-foreground">Нет филиалов</h1>
          <p className="mt-2 text-muted-foreground">
            {canAccessAdmin
              ? "Создайте первый филиал, чтобы увидеть дашборд."
              : "Для вас не назначен филиал."}
          </p>
          {canAccessAdmin && (
            <Button asChild className="mt-6">
              <Link href="/admin/branches/new">Создать филиал</Link>
            </Button>
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
    <>
      <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4">
        <div>
          <h1 className="text-sm font-semibold text-foreground">Дашборд</h1>
          <p className="text-xs text-muted-foreground">
            {employee ? "Ваши показатели за сегодня" : "Ключевые показатели за сегодня"}
            {currentBranch ? ` · ${currentBranch.name}` : ""}
          </p>
        </div>
        {canAccessAdmin && branches.length > 1 && (
          <div className="flex items-center gap-2">
            {branches.map((branch) => (
              <Button
                key={branch.id}
                variant={branch.id === branchId ? "secondary" : "ghost"}
                size="sm"
                asChild
              >
                <Link href={`/dashboard?branchId=${branch.id}`}>{branch.name}</Link>
              </Button>
            ))}
          </div>
        )}
      </header>

      <main className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
    </>
  );
}
