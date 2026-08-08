"use client";

import {
  createWarehouse,
  updateWarehouse,
} from "@/app/admin/inventory/actions";
import { WarehouseForm } from "./warehouse-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface WarehouseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branches: Array<{ id: string; name: string }>;
  warehouse?: {
    id: string;
    branchId: string;
    name: string;
    description?: string | null;
  } | null;
}

export function WarehouseDialog({
  open,
  onOpenChange,
  branches,
  warehouse,
}: WarehouseDialogProps) {
  const isEdit = !!warehouse;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Редактировать склад" : "Новый склад"}
          </DialogTitle>
          <DialogDescription>
            Склад — группировка товаров внутри филиала.
          </DialogDescription>
        </DialogHeader>

        <WarehouseForm
          action={isEdit ? updateWarehouse : createWarehouse}
          branches={branches}
          warehouse={warehouse}
          onSuccess={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
