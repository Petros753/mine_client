import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { CredentialsForm } from "@/components/credentials-form";
import { login } from "./actions";

export const metadata = {
  title: "Вход",
};

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow dark:bg-zinc-900">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Вход
        </h1>
        <p className="mt-1 mb-6 text-sm text-zinc-600 dark:text-zinc-400">
          Войдите в аккаунт, чтобы управлять записями
        </p>

        <CredentialsForm
          action={login}
          submitLabel="Войти"
          pendingLabel="Входим…"
          fields={[
            {
              id: "email",
              label: "Email",
              type: "email",
              autoComplete: "email",
              placeholder: "owner@example.com",
            },
            {
              id: "password",
              label: "Пароль",
              type: "password",
              autoComplete: "current-password",
            },
          ]}
        />

        <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">
          Нет аккаунта?{" "}
          <Link
            href="/register"
            className="font-medium text-zinc-900 underline dark:text-zinc-50"
          >
            Зарегистрировать компанию
          </Link>
        </p>
      </div>
    </div>
  );
}
