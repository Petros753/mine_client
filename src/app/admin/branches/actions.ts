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

  // Стартовые склады, аналогично дефолтам YCLIENTS: чтобы админ сразу мог
  // заводить товары, не переходя предварительно в /admin/inventory/warehouses.
  // Всё в одной транзакции — филиал без хотя бы одного склада заводить
  // бессмысленно, а откатывать пол-состояния мы не хотим.
  await prisma.$transaction(async (tx) => {
    const branch = await tx.branch.create({
      data: {
        companyId,
        name,
        address: address || null,
        phone: phone || null,
      },
    });

    await tx.warehouse.createMany({
      data: [
        {
          branchId: branch.id,
          name: "Расходники",
          description: "Для учёта расходных материалов",
        },
        {
          branchId: branch.id,
          name: "Товары",
          description: "Для учёта продаж в магазине",
        },
      ],
    });
  });

  revalidatePath("/admin/branches");
  revalidatePath("/admin/inventory/warehouses");
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
