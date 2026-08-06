"use server";

import { AuthError } from "next-auth";
import { prisma } from "@/lib/prisma";
import { hashPassword, signIn } from "@/lib/auth";
import { MIN_PASSWORD_LENGTH, type AuthFormState } from "@/lib/auth-forms";

export async function acceptInvitation(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("passwordConfirm") ?? "");

  if (!token || !password) {
    return { error: "Заполните все поля" };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      error: `Пароль должен быть не короче ${MIN_PASSWORD_LENGTH} символов`,
    };
  }
  if (password !== passwordConfirm) {
    return { error: "Пароли не совпадают" };
  }

  const invitation = await prisma.invitationToken.findUnique({
    where: { token },
    include: { employee: { include: { user: true } } },
  });

  const isValid =
    invitation && invitation.usedAt === null && invitation.expiresAt > new Date();

  if (!isValid) {
    return { error: "Ссылка недействительна или уже использована" };
  }

  const passwordHash = await hashPassword(password);

  // Помечаем токен использованным и ставим пароль атомарно: при гонке
  // двух сабмитов второй не найдёт неиспользованный токен
  const updated = await prisma.invitationToken.updateMany({
    where: { id: invitation.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  if (updated.count === 0) {
    return { error: "Ссылка недействительна или уже использована" };
  }

  await prisma.user.update({
    where: { id: invitation.employee.userId },
    data: { passwordHash },
  });

  try {
    await signIn("credentials", {
      email: invitation.employee.user.email,
      password,
      redirectTo: "/my-appointments",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        error: "Пароль сохранён, но войти не удалось — попробуйте войти вручную",
      };
    }
    throw error;
  }

  return {};
}
