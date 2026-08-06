import { redirect } from "next/navigation";
import { getCompanyBranches, requireAdminCompanyId, resolveBranchId } from "@/lib/tenant";
import { NewEmployeeShell } from "@/components/workspace/new-employee-shell";

export default async function NewEmployeePage(
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

  return <NewEmployeeShell branches={branches} defaultBranchId={defaultBranchId} />;
}
