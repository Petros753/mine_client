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

export interface ServiceFormState {
  error?: string;
  ok?: boolean;
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
  } | null;
  onSuccess?: () => void;
  submitLabel?: string;
}

export function ServiceForm({
  action,
  branches,
  defaultBranchId,
  service,
  onSuccess,
  submitLabel,
}: ServiceFormProps) {
  const isEdit = !!service;
  const [state, formAction, pending] = useActionState(action, {});

  useEffect(() => {
    if (state.ok && onSuccess) {
      onSuccess();
    }
  }, [state.ok, onSuccess]);

  return (
    <form action={formAction} className="space-y-4">
      {isEdit && <input type="hidden" name="serviceId" value={service.id} />}

      <div className="space-y-1.5">
        <Label htmlFor="branchId">Филиал *</Label>
        <Select
          name="branchId"
          defaultValue={service?.branchId ?? defaultBranchId ?? branches[0]?.id}
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
