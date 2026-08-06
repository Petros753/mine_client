"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  assertBranchBelongsToCompany,
  requireAdminCompanyId,
} from "@/lib/tenant";

export interface ServiceFormState {
  error?: string;
  ok?: boolean;
}

export async function createService(
  _prevState: ServiceFormState,
  formData: FormData
): Promise<ServiceFormState> {
  const companyId = await requireAdminCompanyId();

  const branchId = String(formData.get("branchId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const durationMinutes = parseInt(String(formData.get("durationMinutes") ?? ""));
  const price = parseFloat(String(formData.get("price") ?? ""));

  if (!branchId || !name || !durationMinutes || isNaN(price)) {
    return { error: "Заполните все обязательные поля" };
  }

  await assertBranchBelongsToCompany(branchId, companyId);

  await prisma.service.create({
    data: {
      branchId,
      name,
      description: description || null,
      durationMinutes,
      price,
    },
  });

  revalidatePath("/admin/services");
  return { ok: true };
}

export async function updateService(
  _prevState: ServiceFormState,
  formData: FormData
): Promise<ServiceFormState> {
  const companyId = await requireAdminCompanyId();

  const serviceId = String(formData.get("serviceId") ?? "");
  const branchId = String(formData.get("branchId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const durationMinutes = parseInt(String(formData.get("durationMinutes") ?? ""));
  const price = parseFloat(String(formData.get("price") ?? ""));
  const isActive = formData.get("isActive") === "on";

  if (!serviceId || !branchId || !name || !durationMinutes || isNaN(price)) {
    return { error: "Некорректные параметры" };
  }

  await assertBranchBelongsToCompany(branchId, companyId);

  const service = await prisma.service.findFirst({
    where: { id: serviceId, branch: { companyId } },
    select: { id: true },
  });

  if (!service) {
    return { error: "Услуга не найдена" };
  }

  await prisma.service.update({
    where: { id: serviceId },
    data: {
      branchId,
      name,
      description: description || null,
      durationMinutes,
      price,
      isActive,
    },
  });

  revalidatePath("/admin/services");
  return { ok: true };
}
