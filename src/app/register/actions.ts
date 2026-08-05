"use server";

import { AuthError } from "next-auth";
import { prisma } from "@/lib/prisma";
import { hashPassword, signIn } from "@/lib/auth";
import { MIN_PASSWORD_LENGTH, type AuthFormState } from "@/lib/auth-forms";

export async function register(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const companyName = String(formData.get("companyName") ?? "").trim();
  const firstName = String(formData.get("firstName") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("passwordConfirm") ?? "");

  if (!companyName || !firstName || !email || !password) {
    return { error: "Заполните все обязательные поля" };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      error: `Пароль должен быть не короче ${MIN_PASSWORD_LENGTH} символов`,
    };
  }
  if (password !== passwordConfirm) {
    return { error: "Пароли не совпадают" };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "Пользователь с таким email уже зарегистрирован" };
  }

  const passwordHash = await hashPassword(password);

  try {
    // Компания и владелец создаются вместе: если что-то упадёт, не должно
    // остаться ни «пустой» компании, ни владельца без компании
    await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({ data: { name: companyName } });
      await tx.user.create({
        data: {
          companyId: company.id,
          email,
          passwordHash,
          firstName,
          role: "OWNER",
        },
      });
    });
  } catch (error) {
    console.error("[register] Не удалось создать компанию и владельца:", error);
    return { error: "Не удалось завершить регистрацию, попробуйте ещё раз" };
  }

  try {
    await signIn("credentials", { email, password, redirectTo: "/admin" });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Аккаунт создан, но войти не удалось — попробуйте войти вручную" };
    }
    throw error;
  }

  return {};
}
