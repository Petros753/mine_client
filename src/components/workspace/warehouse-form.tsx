"use client";

import { useActionState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface WarehouseFormState {
  error?: string;
  ok?: boolean;
}

interface WarehouseFormProps {
  action: (
    prevState: WarehouseFormState,
    formData: FormData
  ) => Promise<WarehouseFormState>;
  branches: Array<{ id: string; name: string }>;
  warehouse?: {
    id: string;
    branchId: string;
    name: string;
    description?: string | null;
  } | null;
  onSuccess?: () => void;
}

export function WarehouseForm({
  action,
  branches,
  warehouse,
  onSuccess,
}: WarehouseFormProps) {
  const isEdit = !!warehouse;
  const [state, formAction, pending] = useActionState(action, {});

  useEffect(() => {
    if (state.ok && onSuccess) onSuccess();
  }, [state.ok, onSuccess]);

  return (
    <form action={formAction} className="space-y-4">
      {isEdit && (
        <input type="hidden" name="warehouseId" value={warehouse.id} />
      )}

      {/* При создании выбор филиала обязателен; при редактировании филиал
          не меняем — товары нельзя перекидывать между филиалами без
          переезда их же самих */}
      {!isEdit && (
        <div className="space-y-1.5">
          <Label htmlFor="branchId">Филиал *</Label>
          <Select name="branchId" defaultValue={branches[0]?.id}>
            <SelectTrigger>
              {/* base-ui: без render-функции SelectValue рисует id */}
              <SelectValue placeholder="Выберите филиал">
                {(value) =>
                  branches.find((b) => b.id === value)?.name ??
                  "Выберите филиал"
                }
              </SelectValue>
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
      )}

      <div className="space-y-1.5">
        <Label htmlFor="name">Название *</Label>
        <Input
          id="name"
          name="name"
          required
          defaultValue={warehouse?.name}
          placeholder="Расходники"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Описание</Label>
        <textarea
          id="description"
          name="description"
          rows={2}
          defaultValue={warehouse?.description ?? ""}
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="Для учёта расходных материалов"
        />
      </div>

      {state.error && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={pending || branches.length === 0}>
          {pending ? "Сохраняем…" : isEdit ? "Сохранить" : "Создать"}
        </Button>
      </div>
    </form>
  );
}
