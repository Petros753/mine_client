import Link from "next/link";

export default function SuccessPage({
  params,
}: {
  params: { branchId: string };
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto max-w-md px-4 text-center">
        <div className="rounded-lg bg-white p-8 shadow dark:bg-zinc-900">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
            <svg
              className="h-8 w-8 text-green-600 dark:text-green-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="mt-6 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Запись создана!
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Мы отправили подтверждение на ваш телефон. Ожидайте звонка администратора для подтверждения записи.
          </p>
          <div className="mt-8">
            <Link
              href={`/book/${params.branchId}`}
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Записаться ещё
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
