"use client";

import {
  createEmployee,
  updateEmployee,
} from "@/app/admin/employees/actions";
import { EmployeeForm } from "./employee-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface EmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branches: Array<{ id: string; name: string }>;
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
}

export function EmployeeDialog({
  open,
  onOpenChange,
  branches,
  employee,
}: EmployeeDialogProps) {
  const isEdit = !!employee;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Редактировать сотрудника" : "Новый сотрудник"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Измените данные сотрудника."
              : "Создайте профиль мастера или специалиста."}
          </DialogDescription>
        </DialogHeader>

        <EmployeeForm
          action={isEdit ? updateEmployee : createEmployee}
          branches={branches}
          employee={employee}
          onSuccess={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
