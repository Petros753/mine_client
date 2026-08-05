import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { CredentialsForm } from "@/components/credentials-form";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth-forms";
import { register } from "./actions";

export const metadata = {
  title: "Регистрация компании",
};

export default async function RegisterPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-zinc-950">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow dark:bg-zinc-900">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Регистрация компании
        </h1>
        <p className="mt-1 mb-6 text-sm text-zinc-600 dark:text-zinc-400">
          Создадим компанию и аккаунт владельца
        </p>

        <CredentialsForm
          action={register}
          submitLabel="Зарегистрировать"
          pendingLabel="Создаём аккаунт…"
          fields={[
            {
              id: "companyName",
              label: "Название компании",
              placeholder: "Салон красоты «Элегант»",
            },
            {
              id: "firstName",
              label: "Ваше имя",
              autoComplete: "given-name",
              placeholder: "Иван",
            },
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
              autoComplete: "new-password",
              minLength: MIN_PASSWORD_LENGTH,
              hint: `Минимум ${MIN_PASSWORD_LENGTH} символов`,
            },
            {
              id: "passwordConfirm",
              label: "Пароль ещё раз",
              type: "password",
              autoComplete: "new-password",
            },
          ]}
        />

        <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">
          Уже есть аккаунт?{" "}
          <Link
            href="/login"
            className="font-medium text-zinc-900 underline dark:text-zinc-50"
          >
            Войти
          </Link>
        </p>
      </div>
    </div>
  );
}
