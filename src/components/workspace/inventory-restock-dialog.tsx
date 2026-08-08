"use client";

import { useEffect, useState, useTransition } from "react";
import { restockInventoryItem } from "@/app/admin/inventory/actions";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface RestockItem {
  id: string;
  name: string;
  unit: string;
  branchName: string;
}

interface InventoryRestockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: RestockItem[];
  /** Товар, для которого открыт диалог. `null` → пользователь выбирает сам. */
  defaultItemId?: string | null;
}

export function InventoryRestockDialog({
  open,
  onOpenChange,
  items,
  defaultItemId,
}: InventoryRestockDialogProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [itemId, setItemId] = useState<string>(
    defaultItemId ?? items[0]?.id ?? ""
  );

  // При каждом открытии диалога подставляем актуальный выбор и сбрасываем
  // ошибку прошлой попытки, чтобы форма не помнила ни товар, ни красное
  // сообщение из прошлой сессии.
  useEffect(() => {
    if (open) {
      setItemId(defaultItemId ?? items[0]?.id ?? "");
      setError(null);
    }
  }, [open, defaultItemId, items]);

  const selectedItem = items.find((i) => i.id === itemId);

  /**
   * Явный success-handler вместо useActionState + useEffect(state.ok):
   * прошлая версия не закрывалась во второй раз, потому что state.ok
   * после первого успеха оставался true и повторный успех не менял
   * зависимости эффекта. useTransition даёт прямой доступ к результату
   * без косвенных зависимостей.
   */
  const handleSubmit = (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      const result = await restockInventoryItem({}, formData);
      if (result.ok) {
        onOpenChange(false);
      } else if (result.error) {
        setError(result.error);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Пополнить склад</DialogTitle>
          <DialogDescription>
            Добавит приход в журнал и увеличит остаток товара.
          </DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="itemId">Товар *</Label>
            <Select
              name="itemId"
              value={itemId}
              onValueChange={(v) => setItemId(v ?? "")}
              disabled={items.length === 0}
            >
              <SelectTrigger>
                {/* base-ui: без render-функции SelectValue рисует id */}
                <SelectValue placeholder="Выберите товар">
                  {(value) => {
                    const it = items.find((x) => x.id === value);
                    return it ? `${it.name} · ${it.branchName}` : "Выберите товар";
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {items.map((it) => (
                  <SelectItem key={it.id} value={it.id}>
                    {it.name} · {it.branchName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="quantity">
              Количество{selectedItem ? ` (${selectedItem.unit})` : ""} *
            </Label>
            <Input
              id="quantity"
              name="quantity"
              type="number"
              required
              min="0"
              step="0.01"
              placeholder="0"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="comment">Комментарий</Label>
            <Input
              id="comment"
              name="comment"
              placeholder="Поставщик, номер накладной…"
            />
          </div>

          {error && (
            <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button type="submit" disabled={pending || items.length === 0}>
              {pending ? "Сохраняем…" : "Пополнить"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
