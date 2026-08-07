"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { WarehouseDialog } from "./warehouse-dialog";
import { Plus, Pencil } from "lucide-react";

type Warehouse = {
  id: string;
  branchId: string;
  branchName: string;
  name: string;
  description?: string | null;
  itemsCount: number;
};

interface WarehouseTableProps {
  warehouses: Warehouse[];
  branches: Array<{ id: string; name: string }>;
}

export function WarehouseTable({ warehouses, branches }: WarehouseTableProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Warehouse | null>(null);

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (warehouse: Warehouse) => {
    setEditing(warehouse);
    setDialogOpen(true);
  };

  const showBranchColumn = branches.length > 1;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate} disabled={branches.length === 0}>
          <Plus className="mr-2 h-4 w-4" />
          Добавить склад
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Склад</TableHead>
              {showBranchColumn && <TableHead>Филиал</TableHead>}
              <TableHead>Товаров</TableHead>
              <TableHead className="text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {warehouses.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={showBranchColumn ? 4 : 3}
                  className="h-32 text-center text-muted-foreground"
                >
                  Складов пока нет
                </TableCell>
              </TableRow>
            ) : (
              warehouses.map((w) => (
                <TableRow key={w.id}>
                  <TableCell>
                    <div className="font-medium">{w.name}</div>
                    {w.description && (
                      <div className="text-sm text-muted-foreground line-clamp-1">
                        {w.description}
                      </div>
                    )}
                  </TableCell>
                  {showBranchColumn && <TableCell>{w.branchName}</TableCell>}
                  <TableCell>{w.itemsCount}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(w)}
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

      <WarehouseDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        branches={branches}
        warehouse={editing}
      />
    </div>
  );
}
