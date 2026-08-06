"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminCompanyId } from "@/lib/tenant";

export interface BranchFormState {
  error?: string;
  ok?: boolean;
}

export async function createBranch(
  _prevState: BranchFormState,
  formData: FormData
): Promise<BranchFormState> {
  const companyId = await requireAdminCompanyId();

  const name = String(formData.get("name") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  if (!name) {
    return { error: "Введите название филиала" };
  }

  await prisma.branch.create({
    data: {
      companyId,
      name,
      address: address || null,
      phone: phone || null,
    },
  });

  revalidatePath("/admin/branches");
  return { ok: true };
}

export async function updateBranch(
  _prevState: BranchFormState,
  formData: FormData
): Promise<BranchFormState> {
  const companyId = await requireAdminCompanyId();

  const branchId = String(formData.get("branchId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  if (!branchId || !name) {
    return { error: "Некорректные параметры" };
  }

  const branch = await prisma.branch.findFirst({
    where: { id: branchId, companyId },
    select: { id: true },
  });

  if (!branch) {
    return { error: "Филиал не найден" };
  }

  await prisma.branch.update({
    where: { id: branchId },
    data: {
      name,
      address: address || null,
      phone: phone || null,
    },
  });

  revalidatePath("/admin/branches");
  return { ok: true };
}
