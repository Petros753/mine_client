import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { Sidebar } from "@/components/workspace/sidebar";
import { getCompanyBranches, getCurrentEmployee, isAdminOrOwner } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  if (!isAdminOrOwner(session)) {
    redirect("/dashboard");
  }

  const companyId = session.user.companyId;
  const [branches, employees] = await Promise.all([
    getCompanyBranches(companyId),
    prisma.employee.findMany({
      where: { branch: { companyId } },
      include: { user: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        user={session.user}
        employees={employees.map((e) => ({
          id: e.id,
          firstName: e.user.firstName ?? "",
          lastName: e.user.lastName,
        }))}
        branches={branches}
        companyName={branches[0]?.name}
        onSignOut={handleSignOut}
      />
      <div className="flex flex-1 flex-col overflow-hidden">{children}</div>
    </div>
  );
}
