"use server";

import { revalidatePath } from "next/cache";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { sendEmployeeInvitation } from "@/lib/invitations";
import {
  assertBranchBelongsToCompany,
  requireAdminCompanyId,
} from "@/lib/tenant";

export interface EmployeeFormState {
  error?: string;
  ok?: boolean;
}

/** Повторная отправка приглашения: создаёт новый токен взамен истёкшего */
export async function resendInvitation(
  employeeId: string
): Promise<EmployeeFormState> {
  const companyId = await requireAdminCompanyId();

  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, branch: { companyId } },
    select: { id: true },
  });

  if (!employee) {
    return { error: "Сотрудник не найден" };
  }

  await sendEmployeeInvitation(employee.id);

  revalidatePath("/admin/employees");
  return { ok: true };
}

export async function createEmployee(
  _prevState: EmployeeFormState,
  formData: FormData
): Promise<EmployeeFormState> {
  const companyId = await requireAdminCompanyId();

  const branchId = String(formData.get("branchId") ?? "");
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim();
  const position = String(formData.get("position") ?? "").trim();

  if (!branchId || !firstName || !email) {
    return { error: "Заполните филиал, имя и email" };
  }

  await assertBranchBelongsToCompany(branchId, companyId);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "Пользователь с таким email уже существует" };
  }

  // Случайный нерабочий хэш: сотрудник не сможет войти, пока не задаст
  // собственный пароль по ссылке из приглашения
  const passwordHash = await hashPassword(randomBytes(32).toString("hex"));

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

  const employee = await prisma.employee.create({
    data: {
      userId: user.id,
      branchId,
      position: position || null,
    },
  });

  // Письмо — вспомогательный канал: если отправка не удалась, сотрудник
  // всё равно создан, приглашение можно переслать из списка сотрудников
  await sendEmployeeInvitation(employee.id);

  revalidatePath("/admin/employees");
  return { ok: true };
}

export async function updateEmployee(
  _prevState: EmployeeFormState,
  formData: FormData
): Promise<EmployeeFormState> {
  const companyId = await requireAdminCompanyId();

  const employeeId = String(formData.get("employeeId") ?? "");
  const branchId = String(formData.get("branchId") ?? "");
  const phone = String(formData.get("phone") ?? "").trim();
  const position = String(formData.get("position") ?? "").trim();
  const isBookable = formData.get("isBookable") === "on";

  if (!employeeId || !branchId) {
    return { error: "Некорректные параметры" };
  }

  await assertBranchBelongsToCompany(branchId, companyId);

  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, branch: { companyId } },
    select: { id: true, userId: true },
  });

  if (!employee) {
    return { error: "Сотрудник не найден" };
  }

  await prisma.employee.update({
    where: { id: employeeId },
    data: {
      branchId,
      position: position || null,
      isBookable,
    },
  });

  await prisma.user.update({
    where: { id: employee.userId },
    data: { phone: phone || null },
  });

  revalidatePath("/admin/employees");
  return { ok: true };
}
