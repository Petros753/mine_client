"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { Trash2, Plus } from "lucide-react";
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

export interface ServiceFormState {
  error?: string;
  ok?: boolean;
}

interface InventoryOption {
  id: string;
  name: string;
  unit: string;
  branchId: string;
}

interface IngredientRow {
  /** Локальный ключ строки — item.id уже занят как значение селекта */
  key: string;
  inventoryItemId: string;
  quantityUsed: string;
}

interface ServiceFormProps {
  action: (prevState: ServiceFormState, formData: FormData) => Promise<ServiceFormState>;
  branches: Array<{ id: string; name: string }>;
  defaultBranchId?: string;
  service?: {
    id: string;
    branchId: string;
    name: string;
    description?: string | null;
    durationMinutes: number;
    price: number;
    isActive: boolean;
    ingredients: Array<{ inventoryItemId: string; quantityUsed: number }>;
  } | null;
  /**
   * Товары склада для секции «Списание материалов». Секция показывается
   * только в режиме редактирования и только если товары переданы —
   * форма создания услуги ими не пользуется.
   */
  inventoryItems?: InventoryOption[];
  onSuccess?: () => void;
  submitLabel?: string;
}

let ingredientKeySeq = 0;
const nextIngredientKey = () => `ing-${++ingredientKeySeq}`;

export function ServiceForm({
  action,
  branches,
  defaultBranchId,
  service,
  inventoryItems,
  onSuccess,
  submitLabel,
}: ServiceFormProps) {
  const isEdit = !!service;
  const [state, formAction, pending] = useActionState(action, {});

  const [branchId, setBranchId] = useState<string>(
    service?.branchId ?? defaultBranchId ?? branches[0]?.id ?? ""
  );

  const [ingredients, setIngredients] = useState<IngredientRow[]>(
    () =>
      service?.ingredients.map((ing) => ({
        key: nextIngredientKey(),
        inventoryItemId: ing.inventoryItemId,
        quantityUsed: String(ing.quantityUsed),
      })) ?? []
  );

  useEffect(() => {
    if (state.ok && onSuccess) {
      onSuccess();
    }
  }, [state.ok, onSuccess]);

  // Тех.карта привязана к филиалу услуги: показываем только товары этого
  // филиала. При смене филиала строки с чужими товарами перестают быть
  // валидными, но не удаляем автоматически — просто помечаем в выборе.
  const branchInventory = useMemo(
    () => (inventoryItems ?? []).filter((i) => i.branchId === branchId),
    [inventoryItems, branchId]
  );

  const showIngredientsSection = isEdit && inventoryItems !== undefined;

  const addIngredient = () => {
    setIngredients((rows) => [
      ...rows,
      { key: nextIngredientKey(), inventoryItemId: "", quantityUsed: "" },
    ]);
  };

  const removeIngredient = (key: string) => {
    setIngredients((rows) => rows.filter((r) => r.key !== key));
  };

  const updateIngredient = (
    key: string,
    patch: Partial<Pick<IngredientRow, "inventoryItemId" | "quantityUsed">>
  ) => {
    setIngredients((rows) =>
      rows.map((r) => (r.key === key ? { ...r, ...patch } : r))
    );
  };

  return (
    <form action={formAction} className="space-y-4">
      {isEdit && <input type="hidden" name="serviceId" value={service.id} />}

      <div className="space-y-1.5">
        <Label htmlFor="branchId">Филиал *</Label>
        <Select
          name="branchId"
          value={branchId}
          onValueChange={(v) => setBranchId(v ?? "")}
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
        <Label htmlFor="name">Название услуги *</Label>
        <Input
          id="name"
          name="name"
          required
          defaultValue={service?.name}
          placeholder="Мужская стрижка"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Описание</Label>
        <textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={service?.description ?? ""}
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="Стрижка машинкой и ножницами"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="durationMinutes">Длительность (мин) *</Label>
          <Input
            id="durationMinutes"
            name="durationMinutes"
            type="number"
            required
            min="5"
            step="5"
            defaultValue={service?.durationMinutes ?? 60}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="price">Цена (₽) *</Label>
          <Input
            id="price"
            name="price"
            type="number"
            required
            min="0"
            step="100"
            defaultValue={service?.price ?? 1500}
          />
        </div>
      </div>

      {isEdit && (
        <div className="flex items-center gap-2">
          <Checkbox
            id="isActive"
            name="isActive"
            defaultChecked={service.isActive}
          />
          <Label htmlFor="isActive" className="font-normal">
            Активна
          </Label>
        </div>
      )}

      {showIngredientsSection && (
        <div className="space-y-2 rounded-md border p-3">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Списание материалов</Label>
              <p className="text-xs text-muted-foreground">
                Товары, которые уходят на одну процедуру. Списываются со
                склада при завершении визита.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addIngredient}
              disabled={branchInventory.length === 0}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Добавить
            </Button>
          </div>

          {ingredients.length === 0 && (
            <p className="text-xs text-muted-foreground">
              {branchInventory.length === 0
                ? "У этого филиала пока нет товаров на складе."
                : "Тех.карта пуста — при завершении визита ничего не списывается."}
            </p>
          )}

          <div className="space-y-2">
            {ingredients.map((row) => {
              const selectedItem = branchInventory.find(
                (i) => i.id === row.inventoryItemId
              );
              // Сохраняем чужой (уже выбранный, но из другого филиала) товар
              // видимым — иначе после смены филиала строка становится пустой
              // молча
              const orphaned =
                row.inventoryItemId && !selectedItem
                  ? (inventoryItems ?? []).find(
                      (i) => i.id === row.inventoryItemId
                    )
                  : null;

              return (
                <div key={row.key} className="flex items-start gap-2">
                  <div className="flex-1">
                    <Select
                      name="ingredientItemId"
                      value={row.inventoryItemId}
                      onValueChange={(v) =>
                        updateIngredient(row.key, {
                          inventoryItemId: v ?? "",
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите товар" />
                      </SelectTrigger>
                      <SelectContent>
                        {branchInventory.map((it) => (
                          <SelectItem key={it.id} value={it.id}>
                            {it.name} ({it.unit})
                          </SelectItem>
                        ))}
                        {orphaned && (
                          <SelectItem value={orphaned.id}>
                            {orphaned.name} ({orphaned.unit}) — другой филиал
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-28">
                    <Input
                      name="ingredientQuantity"
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={row.quantityUsed}
                      onChange={(e) =>
                        updateIngredient(row.key, {
                          quantityUsed: e.target.value,
                        })
                      }
                      placeholder={selectedItem?.unit ?? "кол-во"}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeIngredient(row.key)}
                    title="Убрать"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {state.error && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Сохраняем…" : submitLabel ?? (isEdit ? "Сохранить" : "Создать")}
        </Button>
      </div>
    </form>
  );
}
