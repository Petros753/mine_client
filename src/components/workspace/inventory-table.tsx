"use client";

import { useMemo, useState } from "react";
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
import { InventoryDialog } from "./inventory-dialog";
import { Search, Plus, Pencil, ArrowUpDown } from "lucide-react";

type InventoryItem = {
  id: string;
  branchId: string;
  branchName: string;
  name: string;
  sku: string | null;
  unit: string;
  quantity: number;
  costPrice: number;
  minQuantity: number | null;
  isActive: boolean;
};

interface InventoryTableProps {
  items: InventoryItem[];
  branches: Array<{ id: string; name: string }>;
}

type SortKey = "name" | "branch" | "quantity" | "cost";
type SortDir = "asc" | "desc";

/** Товар считается «заканчивается», если задан порог и остаток на нём или ниже */
function isLowStock(item: InventoryItem) {
  return item.minQuantity !== null && item.quantity <= item.minQuantity;
}

export function InventoryTable({ items, branches }: InventoryTableProps) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({
    key: "name",
    dir: "asc",
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);

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
        (i.sku?.toLowerCase().includes(q) ?? false) ||
        i.branchName.toLowerCase().includes(q)
    );

    rows.sort((a, b) => {
      const dir = sort.dir === "asc" ? 1 : -1;
      if (sort.key === "name") return a.name.localeCompare(b.name) * dir;
      if (sort.key === "branch") return a.branchName.localeCompare(b.branchName) * dir;
      if (sort.key === "quantity") return (a.quantity - b.quantity) * dir;
      return (a.costPrice - b.costPrice) * dir;
    });

    return rows;
  }, [items, query, sort]);

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (item: InventoryItem) => {
    setEditing(item);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-4">
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
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Новый товар
        </Button>
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
                  onClick={() => toggleSort("branch")}
                  className="flex items-center gap-1 font-medium"
                >
                  Филиал
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
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  Товары не найдены
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
                    <TableCell>{item.branchName}</TableCell>
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
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(item)}
                        title="Редактировать"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <InventoryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        branches={branches}
        item={editing}
      />
    </div>
  );
}
