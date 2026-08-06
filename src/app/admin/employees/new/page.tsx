import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import {
  assertBranchBelongsToCompany,
  getCompanyBranches,
  requireAdminCompanyId,
  resolveBranchId,
} from "@/lib/tenant";

async function createEmployee(formData: FormData) {
  "use server";

  const companyId = await requireAdminCompanyId();

  const branchId = formData.get("branchId") as string;
  await assertBranchBelongsToCompany(branchId, companyId);

  const firstName = formData.get("firstName") as string;
  const lastName = formData.get("lastName") as string;
  const email = formData.get("email") as string;
  const phone = formData.get("phone") as string;
  const position = formData.get("position") as string;

  // Пароль сотруднику не задаём: ставим случайный хэш, под которым нельзя
  // войти. TODO: приглашение по email со ссылкой на установку пароля.
  const passwordHash = await hashPassword(randomBytes(32).toString("hex"));

  // Создаём пользователя
  const user = await prisma.user.create({
    data: {
      companyId,
      email,
      phone: phone || null,
      firstName,
      lastName: lastName || null,
      passwordHash,
      role: "EMPLOYEE",
    },
  });

  // Создаём профиль сотрудника
  await prisma.employee.create({
    data: {
      userId: user.id,
      branchId,
      position: position || null,
    },
  });

  redirect(`/admin/employees?branchId=${branchId}`);
}

export default async function NewEmployeePage(
  props: {
    searchParams: Promise<{ branchId?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const companyId = await requireAdminCompanyId();
  const branches = await getCompanyBranches(companyId);
  const defaultBranchId = resolveBranchId(branches, searchParams.branchId);

  // Сотрудник привязан к филиалу — без филиала форму показывать нечему
  if (!defaultBranchId) {
    redirect("/admin/branches/new");
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Новый сотрудник
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <form action={createEmployee} className="space-y-6">
          <div>
            <label
              htmlFor="branchId"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Филиал *
            </label>
            <select
              id="branchId"
              name="branchId"
              required
              defaultValue={defaultBranchId}
              className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50 sm:text-sm"
            >
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="firstName"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Имя *
              </label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                required
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50 sm:text-sm"
                placeholder="Иван"
              />
            </div>

            <div>
              <label
                htmlFor="lastName"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Фамилия
              </label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50 sm:text-sm"
                placeholder="Петров"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Email *
            </label>
            <input
              type="email"
              id="email"
              name="email"
              required
              className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50 sm:text-sm"
              placeholder="ivan@example.com"
            />
          </div>

          <div>
            <label
              htmlFor="phone"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Телефон
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50 sm:text-sm"
              placeholder="+7 (999) 123-45-67"
            />
          </div>

          <div>
            <label
              htmlFor="position"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Должность
            </label>
            <input
              type="text"
              id="position"
              name="position"
              className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50 sm:text-sm"
              placeholder="Мастер маникюра"
            />
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Создать сотрудника
            </button>
            <a
              href="/admin/employees"
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Отмена
            </a>
          </div>
        </form>
      </main>
    </div>
  );
}
