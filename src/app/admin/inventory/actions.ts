"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminCompanyId } from "@/lib/tenant";
import { INVENTORY_BRANCH_COOKIE } from "./constants";

export interface InventoryFormState {
  error?: string;
  ok?: boolean;
}

/**
 * Запомнить последний выбранный филиал для /admin/inventory.
 *
 * Пишем cookie на сервере, а не через document.cookie: только сервер может
 * вызвать revalidatePath — иначе Router Cache клиента продолжит отдавать
 * RSC, отрендеренный ДО выставления cookie, и повторный заход по чистому
 * /admin/inventory через sidebar показывал бы старый дефолтный филиал.
 */
export async function rememberInventoryBranch(branchId: string): Promise<void> {
  const companyId = await requireAdminCompanyId();

  // Не доверяем клиенту: проверяем, что филиал принадлежит его компании,
  // иначе злонамеренный запрос мог бы записать чужой id в cookie.
  const branch = await prisma.branch.findFirst({
    where: { id: branchId, companyId },
    select: { id: true },
  });
  if (!branch) return;

  const store = await cookies();
  store.set(INVENTORY_BRANCH_COOKIE, branch.id, {
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 дней
    sameSite: "lax",
    httpOnly: false,
  });

  revalidatePath("/admin/inventory");
}

/** Единицы измерения: те же, что и в диалоге создания товара */
const ALLOWED_UNITS = ["шт", "мл", "г", "л", "кг"] as const;

function parseDecimal(raw: FormDataEntryValue | null): number | null {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Склад для мутации: id пришёл из формы, проверяем принадлежность компании
 * и возвращаем сам склад (нужен branchId для журнала транзакций).
 */
async function requireWarehouse(
  warehouseId: string,
  companyId: string
): Promise<{ id: string; branchId: string }> {
  const warehouse = await prisma.warehouse.findFirst({
    where: { id: warehouseId, branch: { companyId } },
    select: { id: true, branchId: true },
  });
  if (!warehouse) {
    throw new Error("Склад не найден в вашей компании");
  }
  return warehouse;
}

export async function createInventoryItem(
  _prevState: InventoryFormState,
  formData: FormData
): Promise<InventoryFormState> {
  const companyId = await requireAdminCompanyId();

  const warehouseId = String(formData.get("warehouseId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const sku = String(formData.get("sku") ?? "").trim();
  const unit = String(formData.get("unit") ?? "").trim();
  const costPrice = parseDecimal(formData.get("costPrice"));
  const minQuantity = parseDecimal(formData.get("minQuantity"));

  if (!warehouseId || !name || !unit || costPrice === null) {
    return { error: "Заполните склад, название, единицу и себестоимость" };
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

  await requireWarehouse(warehouseId, companyId);

  // quantity намеренно не принимаем: остаток заводится через «Пополнить»,
  // чтобы приход всегда был отражён в журнале InventoryTransaction.
  await prisma.inventoryItem.create({
    data: {
      warehouseId,
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
  const warehouseId = String(formData.get("warehouseId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const sku = String(formData.get("sku") ?? "").trim();
  const unit = String(formData.get("unit") ?? "").trim();
  const costPrice = parseDecimal(formData.get("costPrice"));
  const minQuantity = parseDecimal(formData.get("minQuantity"));
  const isActive = formData.get("isActive") === "on";

  if (!itemId || !warehouseId || !name || !unit || costPrice === null) {
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

  await requireWarehouse(warehouseId, companyId);

  const item = await prisma.inventoryItem.findFirst({
    where: { id: itemId, warehouse: { branch: { companyId } } },
    select: { id: true },
  });

  if (!item) {
    return { error: "Товар не найден" };
  }

  await prisma.inventoryItem.update({
    where: { id: itemId },
    data: {
      warehouseId,
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

/**
 * Приход товара на склад.
 *
 * Обновление остатка и запись в журнал — атомарно: пополнения без строки
 * в InventoryTransaction (и наоборот) существовать не должно.
 */
export async function restockInventoryItem(
  _prevState: InventoryFormState,
  formData: FormData
): Promise<InventoryFormState> {
  const companyId = await requireAdminCompanyId();

  const itemId = String(formData.get("itemId") ?? "");
  const quantity = parseDecimal(formData.get("quantity"));
  const comment = String(formData.get("comment") ?? "").trim();

  if (!itemId || quantity === null) {
    return { error: "Выберите товар и укажите количество" };
  }
  if (quantity <= 0) {
    return { error: "Количество должно быть положительным" };
  }

  const item = await prisma.inventoryItem.findFirst({
    where: { id: itemId, warehouse: { branch: { companyId } } },
    select: { id: true, warehouse: { select: { branchId: true } } },
  });

  if (!item) {
    return { error: "Товар не найден" };
  }

  await prisma.$transaction([
    prisma.inventoryTransaction.create({
      data: {
        inventoryItemId: item.id,
        branchId: item.warehouse.branchId,
        type: "RESTOCK",
        quantity,
        comment: comment || null,
      },
    }),
    prisma.inventoryItem.update({
      where: { id: item.id },
      data: { quantity: { increment: quantity } },
    }),
  ]);

  revalidatePath("/admin/inventory");
  return { ok: true };
}

/**
 * «Мягкое» удаление товара: помечаем isActive=false.
 *
 * Физически удалять нельзя: InventoryTransaction — это аудит-журнал
 * с ссылкой на appointmentId (история списаний за визиты), а
 * ServiceIngredient — тех.карты услуг, по которым идёт автосписание.
 * Cascade DELETE стёр бы и историю, и тех.карты, обычно без ведома
 * администратора.
 */
export async function softDeleteInventoryItem(itemId: string): Promise<void> {
  const companyId = await requireAdminCompanyId();

  const item = await prisma.inventoryItem.findFirst({
    where: { id: itemId, warehouse: { branch: { companyId } } },
    select: { id: true },
  });
  if (!item) return;

  await prisma.inventoryItem.update({
    where: { id: item.id },
    data: { isActive: false },
  });

  revalidatePath("/admin/inventory");
}

/** Восстановить скрытый товар: возвращает isActive=true. */
export async function restoreInventoryItem(itemId: string): Promise<void> {
  const companyId = await requireAdminCompanyId();

  const item = await prisma.inventoryItem.findFirst({
    where: { id: itemId, warehouse: { branch: { companyId } } },
    select: { id: true },
  });
  if (!item) return;

  await prisma.inventoryItem.update({
    where: { id: item.id },
    data: { isActive: true },
  });

  revalidatePath("/admin/inventory");
}

// -----------------------------------------------------
// Склады (Warehouse)
// -----------------------------------------------------

export async function createWarehouse(
  _prevState: InventoryFormState,
  formData: FormData
): Promise<InventoryFormState> {
  const companyId = await requireAdminCompanyId();

  const branchId = String(formData.get("branchId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!branchId || !name) {
    return { error: "Заполните филиал и название склада" };
  }

  const branch = await prisma.branch.findFirst({
    where: { id: branchId, companyId },
    select: { id: true },
  });
  if (!branch) {
    return { error: "Филиал не найден" };
  }

  await prisma.warehouse.create({
    data: {
      branchId,
      name,
      description: description || null,
    },
  });

  revalidatePath("/admin/inventory/warehouses");
  revalidatePath("/admin/inventory");
  return { ok: true };
}

export async function updateWarehouse(
  _prevState: InventoryFormState,
  formData: FormData
): Promise<InventoryFormState> {
  const companyId = await requireAdminCompanyId();

  const warehouseId = String(formData.get("warehouseId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!warehouseId || !name) {
    return { error: "Некорректные параметры" };
  }

  const warehouse = await prisma.warehouse.findFirst({
    where: { id: warehouseId, branch: { companyId } },
    select: { id: true },
  });

  if (!warehouse) {
    return { error: "Склад не найден" };
  }

  await prisma.warehouse.update({
    where: { id: warehouseId },
    data: {
      name,
      description: description || null,
    },
  });

  revalidatePath("/admin/inventory/warehouses");
  revalidatePath("/admin/inventory");
  return { ok: true };
}
