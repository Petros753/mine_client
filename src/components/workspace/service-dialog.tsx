"use client";

import {
  createService,
  updateService,
} from "@/app/admin/services/actions";
import { ServiceForm } from "./service-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branches: Array<{ id: string; name: string }>;
  service?: {
    id: string;
    branchId: string;
    name: string;
    description?: string | null;
    durationMinutes: number;
    price: number;
    isActive: boolean;
  } | null;
}

export function ServiceDialog({
  open,
  onOpenChange,
  branches,
  service,
}: ServiceDialogProps) {
  const isEdit = !!service;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Редактировать услугу" : "Новая услуга"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Измените параметры услуги."
              : "Добавьте новую услугу с длительностью и ценой."}
          </DialogDescription>
        </DialogHeader>

        <ServiceForm
          action={isEdit ? updateService : createService}
          branches={branches}
          service={service}
          onSuccess={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
