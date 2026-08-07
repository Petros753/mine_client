"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  assertBranchBelongsToCompany,
  requireAdminCompanyId,
} from "@/lib/tenant";

export interface InventoryFormState {
  error?: string;
  ok?: boolean;
}

/** Единицы измерения: те же, что и в диалоге создания товара */
const ALLOWED_UNITS = ["шт", "мл", "г", "л", "кг"] as const;

function parseDecimal(raw: FormDataEntryValue | null): number | null {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

export async function createInventoryItem(
  _prevState: InventoryFormState,
  formData: FormData
): Promise<InventoryFormState> {
  const companyId = await requireAdminCompanyId();

  const branchId = String(formData.get("branchId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const sku = String(formData.get("sku") ?? "").trim();
  const unit = String(formData.get("unit") ?? "").trim();
  const costPrice = parseDecimal(formData.get("costPrice"));
  const minQuantity = parseDecimal(formData.get("minQuantity"));

  if (!branchId || !name || !unit || costPrice === null) {
    return { error: "Заполните название, единицу и себестоимость" };
  }
  if (!ALLOWED_UNITS.includes(unit as (typeof ALLOWED_UNITS)[number])) {
    return { error: "Некорректная единица измерения" };
  }
  if (costPrice < 0) {
    return { error: "Себестоимость не может быть отрицательной" };
  }
  if (minQuantity !== null && minQuantity < 0) {
    return { error: "Минимальный остаток не может быть отрицательным" };
  }

  await assertBranchBelongsToCompany(branchId, companyId);

  // quantity намеренно не принимаем: остаток заводится через «Пополнить»,
  // чтобы приход всегда был отражён в журнале InventoryTransaction.
  await prisma.inventoryItem.create({
    data: {
      branchId,
      name,
      sku: sku || null,
      unit,
      costPrice,
      minQuantity,
    },
  });

  revalidatePath("/admin/inventory");
  return { ok: true };
}

export async function updateInventoryItem(
  _prevState: InventoryFormState,
  formData: FormData
): Promise<InventoryFormState> {
  const companyId = await requireAdminCompanyId();

  const itemId = String(formData.get("itemId") ?? "");
  const branchId = String(formData.get("branchId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const sku = String(formData.get("sku") ?? "").trim();
  const unit = String(formData.get("unit") ?? "").trim();
  const costPrice = parseDecimal(formData.get("costPrice"));
  const minQuantity = parseDecimal(formData.get("minQuantity"));
  const isActive = formData.get("isActive") === "on";

  if (!itemId || !branchId || !name || !unit || costPrice === null) {
    return { error: "Некорректные параметры" };
  }
  if (!ALLOWED_UNITS.includes(unit as (typeof ALLOWED_UNITS)[number])) {
    return { error: "Некорректная единица измерения" };
  }
  if (costPrice < 0) {
    return { error: "Себестоимость не может быть отрицательной" };
  }
  if (minQuantity !== null && minQuantity < 0) {
    return { error: "Минимальный остаток не может быть отрицательным" };
  }

  await assertBranchBelongsToCompany(branchId, companyId);

  const item = await prisma.inventoryItem.findFirst({
    where: { id: itemId, branch: { companyId } },
    select: { id: true },
  });

  if (!item) {
    return { error: "Товар не найден" };
  }

  await prisma.inventoryItem.update({
    where: { id: itemId },
    data: {
      branchId,
      name,
      sku: sku || null,
      unit,
      costPrice,
      minQuantity,
      isActive,
    },
  });

  revalidatePath("/admin/inventory");
  return { ok: true };
}

