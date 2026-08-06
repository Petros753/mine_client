import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { Sidebar } from "@/components/workspace/sidebar";
import { getCompanyBranches, getCurrentEmployee } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function MyAppointmentsLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const companyId = session.user.companyId;
  const [branches, employee] = await Promise.all([
    getCompanyBranches(companyId),
    getCurrentEmployee(session.user.id),
  ]);

  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        user={session.user}
        companyName={employee?.branch?.id ? branches.find((b) => b.id === employee.branch.id)?.name : branches[0]?.name}
        onSignOut={handleSignOut}
      />
      <div className="flex flex-1 flex-col overflow-hidden">{children}</div>
    </div>
  );
}
