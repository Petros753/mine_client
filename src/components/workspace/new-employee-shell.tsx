"use client";

import { useRouter } from "next/navigation";
import { createEmployee } from "@/app/admin/employees/actions";
import { PageShell } from "./page-shell";
import { EmployeeForm } from "./employee-form";

interface NewEmployeeShellProps {
  branches: Array<{ id: string; name: string }>;
  defaultBranchId: string;
}

export function NewEmployeeShell({ branches, defaultBranchId }: NewEmployeeShellProps) {
  const router = useRouter();

  return (
    <PageShell title="Новый сотрудник" subtitle="Создание профиля мастера или специалиста">
      <EmployeeForm
        action={createEmployee}
        branches={branches}
        defaultBranchId={defaultBranchId}
        submitLabel="Создать сотрудника"
        onSuccess={() => router.push("/admin/employees")}
      />
    </PageShell>
  );
}
