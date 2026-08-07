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
import { ServiceDialog } from "./service-dialog";
import { Search, Plus, Pencil, ArrowUpDown } from "lucide-react";

type Service = {
  id: string;
  branchId: string;
  branchName: string;
  name: string;
  description?: string | null;
  durationMinutes: number;
  price: number;
  isActive: boolean;
  ingredients: Array<{ inventoryItemId: string; quantityUsed: number }>;
};

interface InventoryOption {
  id: string;
  name: string;
  unit: string;
  branchId: string;
}

interface ServiceTableProps {
  services: Service[];
  branches: Array<{ id: string; name: string }>;
  inventoryItems: InventoryOption[];
}

type SortKey = "name" | "branch" | "price" | "duration";
type SortDir = "asc" | "desc";

export function ServiceTable({ services, branches, inventoryItems }: ServiceTableProps) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({
    key: "name",
    dir: "asc",
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);

  const toggleSort = (key: SortKey) => {
    setSort((prev) => ({
      key,
      dir: prev.key === key && prev.dir === "asc" ? "desc" : "asc",
    }));
  };

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    const rows = services.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.description?.toLowerCase().includes(q) ?? false) ||
        s.branchName.toLowerCase().includes(q)
    );

    rows.sort((a, b) => {
      const dir = sort.dir === "asc" ? 1 : -1;
      if (sort.key === "name") {
        return a.name.localeCompare(b.name) * dir;
      }
      if (sort.key === "branch") {
        return a.branchName.localeCompare(b.branchName) * dir;
      }
      if (sort.key === "price") {
        return (a.price - b.price) * dir;
      }
      return (a.durationMinutes - b.durationMinutes) * dir;
    });

    return rows;
  }, [services, query, sort]);

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (service: Service) => {
    setEditing(service);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по названию, описанию"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Новая услуга
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
                  Услуга
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
                  onClick={() => toggleSort("duration")}
                  className="flex items-center gap-1 font-medium"
                >
                  Длительность
                  <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </TableHead>
              <TableHead>
                <button
                  onClick={() => toggleSort("price")}
                  className="flex items-center gap-1 font-medium"
                >
                  Цена
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
                  Услуги не найдены
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((service) => (
                <TableRow key={service.id}>
                  <TableCell>
                    <div className="font-medium">{service.name}</div>
                    {service.description && (
                      <div className="text-sm text-muted-foreground line-clamp-1">
                        {service.description}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{service.branchName}</TableCell>
                  <TableCell>{service.durationMinutes} мин</TableCell>
                  <TableCell>{Number(service.price).toLocaleString("ru-RU")} ₽</TableCell>
                  <TableCell>
                    <Badge variant={service.isActive ? "default" : "secondary"}>
                      {service.isActive ? "Активна" : "Неактивна"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(service)}
                      title="Редактировать"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ServiceDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        branches={branches}
        service={editing}
        inventoryItems={inventoryItems}
      />
    </div>
  );
}
