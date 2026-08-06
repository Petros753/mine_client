"use client";

import {
  createBranch,
  updateBranch,
} from "@/app/admin/branches/actions";
import { BranchForm } from "./branch-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface BranchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branch?: {
    id: string;
    name: string;
    address?: string | null;
    phone?: string | null;
  } | null;
}

export function BranchDialog({ open, onOpenChange, branch }: BranchDialogProps) {
  const isEdit = !!branch;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Редактировать филиал" : "Новый филиал"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Измените данные филиала."
              : "Добавьте новую точку вашего бизнеса."}
          </DialogDescription>
        </DialogHeader>

        <BranchForm
          action={isEdit ? updateBranch : createBranch}
          branch={branch}
          onSuccess={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
