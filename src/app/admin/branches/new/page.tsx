import { requireAdminCompanyId } from "@/lib/tenant";
import { NewBranchShell } from "@/components/workspace/new-branch-shell";

export default async function NewBranchPage() {
  await requireAdminCompanyId();
  return <NewBranchShell />;
}
