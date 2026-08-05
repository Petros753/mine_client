import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

async function createService(formData: FormData) {
  "use server";

  const branchId = formData.get("branchId") as string;
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const durationMinutes = parseInt(formData.get("durationMinutes") as string);
  const price = parseFloat(formData.get("price") as string);

  await prisma.service.create({
    data: {
      branchId,
      name,
      description: description || null,
      durationMinutes,
      price,
    },
  });

  redirect(`/admin/services?branchId=${branchId}`);
}

export default async function NewServicePage({
  searchParams,
}: {
  searchParams: { branchId?: string };
}) {
  const branches = await prisma.branch.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const defaultBranchId = searchParams.branchId || branches[0]?.id;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Новая услуга
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <form action={createService} className="space-y-6">
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

          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Название услуги *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50 sm:text-sm"
              placeholder="Мужская стрижка"
            />
          </div>

          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Описание
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50 sm:text-sm"
              placeholder="Стрижка машинкой и ножницами"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="durationMinutes"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Длительность (мин) *
              </label>
              <input
                type="number"
                id="durationMinutes"
                name="durationMinutes"
                required
                min="5"
                step="5"
                defaultValue="60"
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50 sm:text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="price"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Цена (₽) *
              </label>
              <input
                type="number"
                id="price"
                name="price"
                required
                min="0"
                step="100"
                defaultValue="1500"
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50 sm:text-sm"
              />
            </div>
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Создать услугу
            </button>
            <a
              href="/admin/services"
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
