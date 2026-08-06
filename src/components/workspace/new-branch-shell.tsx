"use client";

import { useRouter } from "next/navigation";
import { createBranch } from "@/app/admin/branches/actions";
import { PageShell } from "./page-shell";
import { BranchForm } from "./branch-form";

export function NewBranchShell() {
  const router = useRouter();

  return (
    <PageShell title="Новый филиал" subtitle="Добавление новой точки вашего бизнеса">
      <BranchForm
        action={createBranch}
        submitLabel="Создать филиал"
        onSuccess={() => router.push("/admin/branches")}
      />
    </PageShell>
  );
}
