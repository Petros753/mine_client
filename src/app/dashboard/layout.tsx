import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { Sidebar } from "@/components/workspace/sidebar";
import {
  getCompanyBranches,
  getCurrentEmployee,
  isAdminOrOwner,
} from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const companyId = session.user.companyId;
  const companyBranches = await getCompanyBranches(companyId);

  // Дашборд открыт и мастерам: им в сайдбаре нужен только свой филиал,
  // иначе ссылка на виджет уведёт в чужую точку
  const employee = isAdminOrOwner(session)
    ? null
    : await getCurrentEmployee(session.user.id);
  const branches = employee
    ? companyBranches.filter((branch) => branch.id === employee.branchId)
    : companyBranches;

  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        user={session.user}
        branches={branches}
        companyName={branches[0]?.name}
        onSignOut={handleSignOut}
      />
      <div className="flex flex-1 flex-col overflow-hidden">{children}</div>
    </div>
  );
}
