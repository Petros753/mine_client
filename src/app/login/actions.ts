"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";
import type { AuthFormState } from "@/lib/auth-forms";

export async function login(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Введите email и пароль" };
  }

  try {
    await signIn("credentials", { email, password, redirectTo: "/dashboard" });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Неверный email или пароль" };
    }
    // redirect() внутри signIn бросает служебное исключение — пропускаем дальше
    throw error;
  }

  return {};
}
