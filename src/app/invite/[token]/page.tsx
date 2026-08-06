import { prisma } from "@/lib/prisma";
import { CredentialsForm } from "@/components/credentials-form";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth-forms";
import { acceptInvitation } from "./actions";

export const metadata = {
  title: "Приглашение",
};

export default async function InvitePage(props: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await props.params;

  const invitation = await prisma.invitationToken.findUnique({
    where: { token },
    include: {
      employee: {
        include: {
          user: { select: { firstName: true, lastName: true } },
          branch: { select: { name: true } },
        },
      },
    },
  });

  const isValid =
    invitation && invitation.usedAt === null && invitation.expiresAt > new Date();

  if (!isValid) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
        <div className="w-full max-w-md rounded-lg bg-white p-8 text-center shadow dark:bg-zinc-900">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Ссылка недействительна
          </h1>
          <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
            Приглашение уже использовано или срок его действия истёк. Попросите
            администратора отправить приглашение повторно — вы получите новое
            письмо со ссылкой.
          </p>
        </div>
      </div>
    );
  }

  const name = [
    invitation.employee.user.firstName,
    invitation.employee.user.lastName,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow dark:bg-zinc-900">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Добро пожаловать, {name}!
        </h1>
        <p className="mt-1 mb-6 text-sm text-zinc-600 dark:text-zinc-400">
          Вас добавили сотрудником филиала «{invitation.employee.branch.name}».
          Придумайте пароль, чтобы начать работу.
        </p>

        <CredentialsForm
          action={acceptInvitation}
          submitLabel="Сохранить пароль и войти"
          pendingLabel="Сохраняем…"
          fields={[
            {
              id: "token",
              label: "Токен",
              type: "hidden",
              defaultValue: token,
            },
            {
              id: "password",
              label: "Придумайте пароль",
              type: "password",
              autoComplete: "new-password",
              minLength: MIN_PASSWORD_LENGTH,
              hint: `Не короче ${MIN_PASSWORD_LENGTH} символов`,
            },
            {
              id: "passwordConfirm",
              label: "Повторите пароль",
              type: "password",
              autoComplete: "new-password",
              minLength: MIN_PASSWORD_LENGTH,
            },
          ]}
        />
      </div>
    </div>
  );
}
