"use client";

import { useRouter } from "next/navigation";
import { createService } from "@/app/admin/services/actions";
import { PageShell } from "./page-shell";
import { ServiceForm } from "./service-form";

interface NewServiceShellProps {
  branches: Array<{ id: string; name: string }>;
  defaultBranchId: string;
}

export function NewServiceShell({ branches, defaultBranchId }: NewServiceShellProps) {
  const router = useRouter();

  return (
    <PageShell title="Новая услуга" subtitle="Создание услуги с длительностью и ценой">
      <ServiceForm
        action={createService}
        branches={branches}
        defaultBranchId={defaultBranchId}
        submitLabel="Создать услугу"
        onSuccess={() => router.push("/admin/services")}
      />
    </PageShell>
  );
}
