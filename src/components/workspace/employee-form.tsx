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

export interface EmployeeFormState {
  error?: string;
  ok?: boolean;
}

interface EmployeeFormProps {
  action: (prevState: EmployeeFormState, formData: FormData) => Promise<EmployeeFormState>;
  branches: Array<{ id: string; name: string }>;
  defaultBranchId?: string;
  employee?: {
    id: string;
    firstName: string;
    lastName?: string | null;
    email: string;
    phone?: string | null;
    position?: string | null;
    branchId: string;
    isBookable: boolean;
  } | null;
  onSuccess?: () => void;
  submitLabel?: string;
}

export function EmployeeForm({
  action,
  branches,
  defaultBranchId,
  employee,
  onSuccess,
  submitLabel,
}: EmployeeFormProps) {
  const isEdit = !!employee;
  const [state, formAction, pending] = useActionState(action, {});

  useEffect(() => {
    if (state.ok && onSuccess) {
      onSuccess();
    }
  }, [state.ok, onSuccess]);

  return (
    <form action={formAction} className="space-y-4">
      {isEdit && <input type="hidden" name="employeeId" value={employee.id} />}

      <div className="space-y-1.5">
        <Label htmlFor="branchId">Филиал *</Label>
        <Select
          name="branchId"
          defaultValue={employee?.branchId ?? defaultBranchId ?? branches[0]?.id}
        >
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

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="firstName">Имя *</Label>
          <Input
            id="firstName"
            name="firstName"
            required
            defaultValue={employee?.firstName}
            disabled={isEdit}
            placeholder="Иван"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lastName">Фамилия</Label>
          <Input
            id="lastName"
            name="lastName"
            defaultValue={employee?.lastName ?? ""}
            disabled={isEdit}
            placeholder="Петров"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email">Email *</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          defaultValue={employee?.email}
          disabled={isEdit}
          placeholder="ivan@example.com"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="phone">Телефон</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          defaultValue={employee?.phone ?? ""}
          placeholder="+7 (999) 123-45-67"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="position">Должность</Label>
        <Input
          id="position"
          name="position"
          defaultValue={employee?.position ?? ""}
          placeholder="Стилист-парикмахер"
        />
      </div>

      {isEdit && (
        <div className="flex items-center gap-2">
          <Checkbox
            id="isBookable"
            name="isBookable"
            defaultChecked={employee.isBookable}
          />
          <Label htmlFor="isBookable" className="font-normal">
            Доступен для онлайн-записи
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
