import { redirect } from "next/navigation";
import {
  getCompanyBranches,
  requireAdminCompanyId,
  resolveBranchId,
} from "@/lib/tenant";
import { NewServiceShell } from "@/components/workspace/new-service-shell";

export default async function NewServicePage(
  props: {
    searchParams: Promise<{ branchId?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const companyId = await requireAdminCompanyId();
  const branches = await getCompanyBranches(companyId);
  const defaultBranchId = resolveBranchId(branches, searchParams.branchId);

  if (!defaultBranchId) {
    redirect("/admin/branches/new");
  }

  return <NewServiceShell branches={branches} defaultBranchId={defaultBranchId} />;
}
