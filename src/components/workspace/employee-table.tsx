"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
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
import { EmployeeDialog } from "./employee-dialog";
import { Search, Plus, Pencil, ArrowUpDown } from "lucide-react";

type Employee = {
  id: string;
  firstName: string;
  lastName?: string | null;
  email: string;
  phone?: string | null;
  position?: string | null;
  branchId: string;
  branchName: string;
  isBookable: boolean;
  servicesCount: number;
};

interface EmployeeTableProps {
  employees: Employee[];
  branches: Array<{ id: string; name: string }>;
}

type SortKey = "name" | "branch" | "position";
type SortDir = "asc" | "desc";

export function EmployeeTable({ employees, branches }: EmployeeTableProps) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({
    key: "name",
    dir: "asc",
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);

  const toggleSort = (key: SortKey) => {
    setSort((prev) => ({
      key,
      dir: prev.key === key && prev.dir === "asc" ? "desc" : "asc",
    }));
  };

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    const rows = employees.filter(
      (e) =>
        `${e.firstName} ${e.lastName ?? ""}`.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        (e.position?.toLowerCase().includes(q) ?? false) ||
        e.branchName.toLowerCase().includes(q)
    );

    rows.sort((a, b) => {
      const dir = sort.dir === "asc" ? 1 : -1;
      if (sort.key === "name") {
        return `${a.firstName} ${a.lastName ?? ""}`.localeCompare(
          `${b.firstName} ${b.lastName ?? ""}`
        ) * dir;
      }
      if (sort.key === "branch") {
        return a.branchName.localeCompare(b.branchName) * dir;
      }
      return (a.position ?? "").localeCompare(b.position ?? "") * dir;
    });

    return rows;
  }, [employees, query, sort]);

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (employee: Employee) => {
    setEditing(employee);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по имени, email, должности"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Новый сотрудник
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
                  Сотрудник
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
                  onClick={() => toggleSort("position")}
                  className="flex items-center gap-1 font-medium"
                >
                  Должность
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
                  Сотрудники не найдены
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell>
                    <div className="font-medium">
                      {employee.firstName} {employee.lastName}
                    </div>
                    <div className="text-sm text-muted-foreground">{employee.email}</div>
                    {employee.phone && (
                      <div className="text-sm text-muted-foreground">{employee.phone}</div>
                    )}
                  </TableCell>
                  <TableCell>{employee.branchName}</TableCell>
                  <TableCell>{employee.position ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={employee.isBookable ? "default" : "secondary"}>
                      {employee.isBookable ? "Доступен" : "Не доступен"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(employee)}
                        title="Редактировать"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/admin/employees/${employee.id}/services`}>
                          Услуги ({employee.servicesCount})
                        </Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <EmployeeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        branches={branches}
        employee={editing}
      />
    </div>
  );
}
