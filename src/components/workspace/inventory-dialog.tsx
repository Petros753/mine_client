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

interface WarehouseOption {
  id: string;
  name: string;
  branchId: string;
  branchName: string;
}

interface InventoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warehouses: WarehouseOption[];
  defaultWarehouseId?: string | null;
  item?: {
    id: string;
    warehouseId: string;
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
  warehouses,
  defaultWarehouseId,
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
          warehouses={warehouses}
          defaultWarehouseId={defaultWarehouseId}
          item={item}
          onSuccess={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
