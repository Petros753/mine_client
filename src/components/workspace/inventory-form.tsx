"use client";

import { useActionState, useEffect } from "react";
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

interface InventoryFormProps {
  action: (
    prevState: InventoryFormState,
    formData: FormData
  ) => Promise<InventoryFormState>;
  branches: Array<{ id: string; name: string }>;
  item?: {
    id: string;
    branchId: string;
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
  branches,
  item,
  onSuccess,
}: InventoryFormProps) {
  const isEdit = !!item;
  const [state, formAction, pending] = useActionState(action, {});

  useEffect(() => {
    if (state.ok && onSuccess) onSuccess();
  }, [state.ok, onSuccess]);

  return (
    <form action={formAction} className="space-y-4">
      {isEdit && <input type="hidden" name="itemId" value={item.id} />}

      <div className="space-y-1.5">
        <Label htmlFor="branchId">Филиал *</Label>
        <Select
          name="branchId"
          defaultValue={item?.branchId ?? branches[0]?.id}
        >
          <SelectTrigger>
            <SelectValue placeholder="Выберите филиал" />
          </SelectTrigger>
          <SelectContent>
            {branches.map((branch) => (
              <SelectItem key={branch.id} value={branch.id}>
                {branch.name}
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
        <Button type="submit" disabled={pending}>
          {pending ? "Сохраняем…" : isEdit ? "Сохранить" : "Создать"}
        </Button>
      </div>
    </form>
  );
}
