import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCompanyId } from "@/lib/tenant";

async function toggleService(employeeId: string, serviceId: string, enabled: boolean) {
  "use server";

  const companyId = await requireCompanyId();

  // Оба id приходят с клиента: проверяем, что сотрудник и услуга — свои
  const [employee, service] = await Promise.all([
    prisma.employee.findFirst({
      where: { id: employeeId, branch: { companyId } },
      select: { id: true },
    }),
    prisma.service.findFirst({
      where: { id: serviceId, branch: { companyId } },
      select: { id: true },
    }),
  ]);

  if (!employee || !service) {
    throw new Error("Сотрудник или услуга не найдены в вашей компании");
  }

  if (enabled) {
    await prisma.employeeService.upsert({
      where: {
        employeeId_serviceId: { employeeId, serviceId },
      },
      update: {},
      create: { employeeId, serviceId },
    });
  } else {
    await prisma.employeeService.delete({
      where: {
        employeeId_serviceId: { employeeId, serviceId },
      },
    });
  }
}

export default async function EmployeeServicesPage(
  props: {
    params: Promise<{ id: string }>;
  }
) {
  const params = await props.params;
  const companyId = await requireCompanyId();
  const employee = await prisma.employee.findFirst({
    where: { id: params.id, branch: { companyId } },
    include: {
      user: true,
      branch: true,
      services: { include: { service: true } },
    },
  });

  if (!employee) {
    notFound();
  }

  const allServices = await prisma.service.findMany({
    where: { branchId: employee.branchId, isActive: true },
    orderBy: { name: "asc" },
  });

  const employeeServiceIds = new Set(employee.services.map((es) => es.serviceId));

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="mb-4">
            <Link
              href="/admin/employees"
              className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
            >
              ← Назад к сотрудникам
            </Link>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Услуги сотрудника
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {employee.user.firstName} {employee.user.lastName} • {employee.branch.name}
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-lg bg-white shadow dark:bg-zinc-900">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
              Выберите услуги, которые оказывает сотрудник
            </h3>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Клиенты смогут записаться только на выбранные услуги
            </p>

            <div className="mt-6 space-y-4">
              {allServices.map((service) => {
                const isEnabled = employeeServiceIds.has(service.id);
                return (
                  <div
                    key={service.id}
                    className="flex items-center justify-between rounded-lg border border-zinc-200 p-4 dark:border-zinc-700"
                  >
                    <div>
                      <h4 className="font-medium text-zinc-900 dark:text-zinc-50">
                        {service.name}
                      </h4>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        {service.durationMinutes} мин • {Number(service.price).toLocaleString("ru-RU")} ₽
                      </p>
                    </div>
                    <form action={toggleService.bind(null, employee.id, service.id, !isEnabled)}>
                      <button
                        type="submit"
                        className={`rounded-md px-4 py-2 text-sm font-medium ${
                          isEnabled
                            ? "bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900 dark:text-green-200"
                            : "bg-zinc-100 text-zinc-800 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200"
                        }`}
                      >
                        {isEnabled ? "✓ Включена" : "Выключена"}
                      </button>
                    </form>
                  </div>
                );
              })}
            </div>

            {allServices.length === 0 && (
              <div className="mt-6 text-center text-zinc-500 dark:text-zinc-400">
                <p>В филиале нет активных услуг.</p>
                <Link
                  href={`/admin/services/new?branchId=${employee.branchId}`}
                  className="mt-2 inline-block text-zinc-900 hover:underline dark:text-zinc-50"
                >
                  Создать услугу →
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
