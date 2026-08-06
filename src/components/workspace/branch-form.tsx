"use client";

import { useActionState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface BranchFormState {
  error?: string;
  ok?: boolean;
}

interface BranchFormProps {
  action: (prevState: BranchFormState, formData: FormData) => Promise<BranchFormState>;
  branch?: {
    id: string;
    name: string;
    address?: string | null;
    phone?: string | null;
  } | null;
  onSuccess?: () => void;
  submitLabel?: string;
}

export function BranchForm({
  action,
  branch,
  onSuccess,
  submitLabel,
}: BranchFormProps) {
  const isEdit = !!branch;
  const [state, formAction, pending] = useActionState(action, {});

  useEffect(() => {
    if (state.ok && onSuccess) {
      onSuccess();
    }
  }, [state.ok, onSuccess]);

  return (
    <form action={formAction} className="space-y-4">
      {isEdit && <input type="hidden" name="branchId" value={branch.id} />}

      <div className="space-y-1.5">
        <Label htmlFor="name">Название филиала *</Label>
        <Input
          id="name"
          name="name"
          required
          defaultValue={branch?.name}
          placeholder="Салон на Арбате"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="address">Адрес</Label>
        <Input
          id="address"
          name="address"
          defaultValue={branch?.address ?? ""}
          placeholder="ул. Арбат, 1"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="phone">Телефон</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          defaultValue={branch?.phone ?? ""}
          placeholder="+7 (999) 123-45-67"
        />
      </div>

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
