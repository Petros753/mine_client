"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface InventoryFormState {
  error?: string;
  ok?: boolean;
}

/** Единицы измерения — держим синхронно с ALLOWED_UNITS в actions */
const UNIT_OPTIONS = ["шт", "мл", "г", "л", "кг"] as const;

interface WarehouseOption {
  id: string;
  name: string;
  branchId: string;
  branchName: string;
}

interface InventoryFormProps {
  action: (
    prevState: InventoryFormState,
    formData: FormData
  ) => Promise<InventoryFormState>;
  warehouses: WarehouseOption[];
  /** Склад по умолчанию для формы создания (обычно — активный на странице) */
  defaultWarehouseId?: string | null;
  item?: {
    id: string;
    warehouseId: string;
    name: string;
    sku?: string | null;
    unit: string;
    costPrice: number;
    minQuantity?: number | null;
    isActive: boolean;
  } | null;
  onSuccess?: () => void;
}

export function InventoryForm({
  action,
  warehouses,
  defaultWarehouseId,
  item,
  onSuccess,
}: InventoryFormProps) {
  const isEdit = !!item;
  const [state, formAction, pending] = useActionState(action, {});

  const [warehouseId, setWarehouseId] = useState<string>(
    item?.warehouseId ?? defaultWarehouseId ?? warehouses[0]?.id ?? ""
  );

  useEffect(() => {
    if (state.ok && onSuccess) onSuccess();
  }, [state.ok, onSuccess]);

  // Если у компании несколько филиалов — рядом со складом показываем филиал,
  // чтобы админ не перепутал одноимённые склады из разных филиалов
  const multipleBranches =
    new Set(warehouses.map((w) => w.branchId)).size > 1;

  return (
    <form action={formAction} className="space-y-4">
      {isEdit && <input type="hidden" name="itemId" value={item.id} />}

      <div className="space-y-1.5">
        <Label htmlFor="warehouseId">Склад *</Label>
        <Select
          name="warehouseId"
          value={warehouseId}
          onValueChange={(v) => setWarehouseId(v ?? "")}
          disabled={warehouses.length === 0}
        >
          <SelectTrigger>
            <SelectValue placeholder="Выберите склад" />
          </SelectTrigger>
          <SelectContent>
            {warehouses.map((w) => (
              <SelectItem key={w.id} value={w.id}>
                {w.name}
                {multipleBranches ? ` · ${w.branchName}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="name">Название *</Label>
        <Input
          id="name"
          name="name"
          required
          defaultValue={item?.name}
          placeholder="Краска для волос"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="sku">Артикул</Label>
          <Input
            id="sku"
            name="sku"
            defaultValue={item?.sku ?? ""}
            placeholder="INV-001"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="unit">Единица *</Label>
          <Select name="unit" defaultValue={item?.unit ?? "шт"}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {UNIT_OPTIONS.map((u) => (
                <SelectItem key={u} value={u}>
                  {u}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="costPrice">Себестоимость (₽) *</Label>
          <Input
            id="costPrice"
            name="costPrice"
            type="number"
            required
            min="0"
            step="0.01"
            defaultValue={item?.costPrice ?? ""}
            placeholder="0"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="minQuantity">Минимальный остаток</Label>
          <Input
            id="minQuantity"
            name="minQuantity"
            type="number"
            min="0"
            step="0.01"
            defaultValue={item?.minQuantity ?? ""}
            placeholder="—"
          />
        </div>
      </div>

      {isEdit && (
        <div className="flex items-center gap-2">
          <Checkbox
            id="isActive"
            name="isActive"
            defaultChecked={item.isActive}
          />
          <Label htmlFor="isActive" className="font-normal">
            Активен
          </Label>
        </div>
      )}

      {!isEdit && (
        <p className="text-xs text-muted-foreground">
          Начальный остаток заведите через «Пополнить» — приход всегда идёт
          через журнал транзакций.
        </p>
      )}

      {state.error && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={pending || warehouses.length === 0}>
          {pending ? "Сохраняем…" : isEdit ? "Сохранить" : "Создать"}
        </Button>
      </div>
    </form>
  );
}
