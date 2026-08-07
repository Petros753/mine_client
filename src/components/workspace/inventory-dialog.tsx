"use client";

import {
  createInventoryItem,
  updateInventoryItem,
} from "@/app/admin/inventory/actions";
import { InventoryForm } from "./inventory-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface InventoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
}

export function InventoryDialog({
  open,
  onOpenChange,
  branches,
  item,
}: InventoryDialogProps) {
  const isEdit = !!item;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Редактировать товар" : "Новый товар"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Измените параметры товара."
              : "Добавьте товар склада. Остаток заведите отдельно через «Пополнить»."}
          </DialogDescription>
        </DialogHeader>

        <InventoryForm
          action={isEdit ? updateInventoryItem : createInventoryItem}
          branches={branches}
          item={item}
          onSuccess={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
