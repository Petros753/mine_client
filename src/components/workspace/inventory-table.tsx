"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InventoryDialog } from "./inventory-dialog";
import { InventoryRestockDialog } from "./inventory-restock-dialog";
import { rememberInventoryBranch } from "@/app/admin/inventory/actions";
import { compareStrings } from "@/lib/utils";
import { Search, Plus, Pencil, ArrowUpDown, PackagePlus } from "lucide-react";

type InventoryItem = {
  id: string;
  warehouseId: string;
  name: string;
  sku: string | null;
  unit: string;
  quantity: number;
  costPrice: number;
  minQuantity: number | null;
  isActive: boolean;
};

interface WarehouseOption {
  id: string;
  name: string;
  branchId: string;
  branchName: string;
}

interface InventoryTableProps {
  items: InventoryItem[];
  branches: Array<{ id: string; name: string }>;
  warehouses: WarehouseOption[];
  /** id филиала, чей склад сейчас активен (или первый филиал компании) */
  activeBranchId: string | null;
  activeWarehouseId: string | null;
}

type SortKey = "name" | "quantity" | "cost";
type SortDir = "asc" | "desc";

/** Товар считается «заканчивается», если задан порог и остаток на нём или ниже */
function isLowStock(item: InventoryItem) {
  return item.minQuantity !== null && item.quantity <= item.minQuantity;
}

export function InventoryTable({
  items,
  branches,
  warehouses,
  activeBranchId,
  activeWarehouseId,
}: InventoryTableProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({
    key: "name",
    dir: "asc",
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [restockOpen, setRestockOpen] = useState(false);
  const [restockItemId, setRestockItemId] = useState<string | null>(null);

  const activeWarehouse =
    warehouses.find((w) => w.id === activeWarehouseId) ?? null;

  // Табы показывают только склады выбранного филиала — раньше был список
  // «BranchName: WarehouseButton» на всю компанию, и одно сочетание
  // «имя филиала: единственный склад» читалось как имя человека.
  const branchWarehouses = useMemo(
    () => warehouses.filter((w) => w.branchId === activeBranchId),
    [warehouses, activeBranchId]
  );

  const toggleSort = (key: SortKey) => {
    setSort((prev) => ({
      key,
      dir: prev.key === key && prev.dir === "asc" ? "desc" : "asc",
    }));
  };

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    const rows = items.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        (i.sku?.toLowerCase().includes(q) ?? false)
    );

    rows.sort((a, b) => {
      const dir = sort.dir === "asc" ? 1 : -1;
      if (sort.key === "name") return compareStrings(a.name, b.name) * dir;
      if (sort.key === "quantity") return (a.quantity - b.quantity) * dir;
      return (a.costPrice - b.costPrice) * dir;
    });

    return rows;
  }, [items, query, sort]);

  const switchWarehouse = (id: string) => {
    // Держим branchId в URL — так после перезагрузки/шеринга ссылки
    // страница остаётся на том же филиале, а не «прыгает» на первый.
    // Server action пишет cookie и инвалидирует Router Cache для
    // /admin/inventory: без этого возврат по чистому /admin/inventory
    // через sidebar отдавал бы старый RSC (cookie ставился только на
    // клиенте, Router Cache о нём не знает).
    if (activeBranchId) rememberInventoryBranch(activeBranchId);
    const suffix = activeBranchId ? `&branchId=${activeBranchId}` : "";
    router.push(`/admin/inventory?warehouseId=${id}${suffix}`);
  };

  const switchBranch = (id: string) => {
    // При смене филиала конкретный склад ещё не выбран — сервер сам
    // подставит первый склад нового филиала.
    rememberInventoryBranch(id);
    router.push(`/admin/inventory?branchId=${id}`);
  };

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (item: InventoryItem) => {
    setEditing(item);
    setDialogOpen(true);
  };

  const openRestock = (itemId?: string) => {
    setRestockItemId(itemId ?? null);
    setRestockOpen(true);
  };

  // Пополнять и создавать имеет смысл, только когда есть куда — если складов
  // ещё нет, отправляем пользователя завести склад
  const noWarehouses = warehouses.length === 0;

  const restockItems = items.map((i) => ({
    id: i.id,
    name: i.name,
    unit: i.unit,
    branchName: activeWarehouse?.branchName ?? "",
  }));

  return (
    <div className="space-y-4">
      {noWarehouses ? (
        <div className="rounded-md border border-dashed p-6 text-center">
          <p className="text-sm text-muted-foreground">
            У вашей компании ещё нет складов.{" "}
            <Link
              href="/admin/inventory/warehouses"
              className="font-medium text-primary hover:underline"
            >
              Создайте первый склад
            </Link>
            , чтобы завести товары.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3 rounded-md border p-3">
            {branches.length > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  Филиал:
                </span>
                <Select
                  value={activeBranchId ?? undefined}
                  onValueChange={(v) => v && switchBranch(v)}
                >
                  <SelectTrigger className="h-8 w-[220px] text-sm">
                    {/* base-ui: без render-функции SelectValue рисует id */}
                    <SelectValue placeholder="Выберите филиал">
                      {(value) =>
                        branches.find((b) => b.id === value)?.name ??
                        "Выберите филиал"
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {branchWarehouses.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                У этого филиала пока нет складов.{" "}
                <Link
                  href="/admin/inventory/warehouses"
                  className="font-medium text-primary hover:underline"
                >
                  Создайте склад
                </Link>
                .
              </p>
            ) : (
              <div className="flex flex-wrap gap-1">
                {branchWarehouses.map((w) => {
                  const active = w.id === activeWarehouseId;
                  return (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => switchWarehouse(w.id)}
                      className={
                        "rounded-md px-3 py-1 text-sm transition-colors " +
                        (active
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground hover:bg-muted/80")
                      }
                    >
                      {w.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по названию, артикулу"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => openRestock()}
                disabled={items.length === 0}
              >
                <PackagePlus className="mr-2 h-4 w-4" />
                Пополнить
              </Button>
              <Button onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Новый товар
              </Button>
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <button
                      onClick={() => toggleSort("name")}
                      className="flex items-center gap-1 font-medium"
                    >
                      Товар
                      <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      onClick={() => toggleSort("quantity")}
                      className="flex items-center gap-1 font-medium"
                    >
                      Остаток
                      <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      onClick={() => toggleSort("cost")}
                      className="flex items-center gap-1 font-medium"
                    >
                      Себестоимость
                      <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                      На этом складе товаров нет
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((item) => {
                    const low = isLowStock(item);
                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="font-medium">{item.name}</div>
                          {item.sku && (
                            <div className="text-sm text-muted-foreground">
                              Артикул: {item.sku}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <span
                            className={
                              item.quantity < 0 ? "text-red-600 dark:text-red-400" : ""
                            }
                          >
                            {item.quantity.toLocaleString("ru-RU")} {item.unit}
                          </span>
                          {item.minQuantity !== null && (
                            <div className="text-xs text-muted-foreground">
                              мин: {item.minQuantity.toLocaleString("ru-RU")}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {item.costPrice.toLocaleString("ru-RU")} ₽
                        </TableCell>
                        <TableCell>
                          {!item.isActive ? (
                            <Badge variant="secondary">Неактивен</Badge>
                          ) : low ? (
                            <Badge className="bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-600/20 hover:bg-amber-100 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/30">
                              Заканчивается
                            </Badge>
                          ) : (
                            <Badge variant="default">В наличии</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openRestock(item.id)}
                              title="Пополнить"
                            >
                              <PackagePlus className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEdit(item)}
                              title="Редактировать"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      <InventoryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        warehouses={warehouses}
        defaultWarehouseId={activeWarehouseId}
        item={editing}
      />
      <InventoryRestockDialog
        open={restockOpen}
        onOpenChange={setRestockOpen}
        items={restockItems}
        defaultItemId={restockItemId}
      />
    </div>
  );
}
