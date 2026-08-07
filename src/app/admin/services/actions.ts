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

/**
 * Разобрать пришедшие из формы строки тех.карты.
 *
 * В форме секция «Списание материалов» — динамический список. Каждая строка
 * приходит парой полей `ingredientItemId[]` и `ingredientQuantity[]` в
 * одинаковом порядке, поэтому вытаскиваем оба массива и соединяем по индексу.
 * Пустые строки (без товара) игнорируем — их могли добавить и не заполнить.
 */
function parseIngredients(
  formData: FormData
): { inventoryItemId: string; quantityUsed: number }[] | { error: string } {
  const itemIds = formData.getAll("ingredientItemId").map((v) => String(v));
  const quantities = formData.getAll("ingredientQuantity").map((v) => String(v));

  const rows: { inventoryItemId: string; quantityUsed: number }[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < itemIds.length; i++) {
    const inventoryItemId = itemIds[i]?.trim() ?? "";
    const raw = quantities[i]?.trim() ?? "";
    if (!inventoryItemId) continue;
    if (seen.has(inventoryItemId)) {
      return { error: "Один и тот же товар не может встречаться дважды" };
    }
    seen.add(inventoryItemId);
    const quantityUsed = Number(raw.replace(",", "."));
    if (!Number.isFinite(quantityUsed) || quantityUsed <= 0) {
      return { error: "Количество списания должно быть положительным" };
    }
    rows.push({ inventoryItemId, quantityUsed });
  }

  return rows;
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

  const ingredients = parseIngredients(formData);
  if ("error" in ingredients) {
    return { error: ingredients.error };
  }

  // Товары тех.карты должны быть на складе выбранного филиала — тот же
  // товар из другого филиала списывать бессмысленно. Склад товара конкретно
  // не важен: любые склады филиала (расходники/товары) годятся.
  if (ingredients.length > 0) {
    const ids = ingredients.map((i) => i.inventoryItemId);
    const validItems = await prisma.inventoryItem.findMany({
      where: { id: { in: ids }, warehouse: { branchId } },
      select: { id: true },
    });
    if (validItems.length !== ids.length) {
      return { error: "Не все товары принадлежат этому филиалу" };
    }
  }

  // Обновление услуги и переустановка тех.карты — атомарно, чтобы не
  // остаться с половинным состоянием при ошибке
  await prisma.$transaction([
    prisma.service.update({
      where: { id: serviceId },
      data: {
        branchId,
        name,
        description: description || null,
        durationMinutes,
        price,
        isActive,
      },
    }),
    prisma.serviceIngredient.deleteMany({ where: { serviceId } }),
    ...(ingredients.length > 0
      ? [
          prisma.serviceIngredient.createMany({
            data: ingredients.map((i) => ({
              serviceId,
              inventoryItemId: i.inventoryItemId,
              quantityUsed: i.quantityUsed,
            })),
          }),
        ]
      : []),
  ]);

  revalidatePath("/admin/services");
  return { ok: true };
}
