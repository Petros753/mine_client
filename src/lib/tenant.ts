import { redirect } from "next/navigation";
import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Сессия авторизованного пользователя или редирект на логин.
 *
 * Использовать в каждом server action и на каждой странице админки: proxy
 * закрывает только навигацию, а server action доступен прямым POST-запросом.
 */
export async function requireSession(): Promise<Session> {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  return session;
}

/** Компания текущего пользователя */
export async function requireCompanyId(): Promise<string> {
  const session = await requireSession();
  return session.user.companyId;
}

export interface BranchOption {
  id: string;
  name: string;
}

/** Филиалы компании — из них состоят все селекторы филиала в админке */
export function getCompanyBranches(companyId: string): Promise<BranchOption[]> {
  return prisma.branch.findMany({
    where: { companyId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

/**
 * Проверяет, что филиал принадлежит компании. Возвращает id запрошенного
 * филиала, а если он чужой или не указан — первый филиал компании.
 * `null` означает, что у компании ещё нет ни одного филиала.
 */
export function resolveBranchId(
  branches: BranchOption[],
  requestedBranchId: string | undefined
): string | null {
  const requested = branches.find((branch) => branch.id === requestedBranchId);
  return requested?.id ?? branches[0]?.id ?? null;
}

/**
 * Проверка принадлежности филиала компании для мутаций: id филиала приходит
 * из формы, то есть от клиента, и доверять ему нельзя.
 */
export async function assertBranchBelongsToCompany(
  branchId: string,
  companyId: string
): Promise<void> {
  const branch = await prisma.branch.findFirst({
    where: { id: branchId, companyId },
    select: { id: true },
  });

  if (!branch) {
    throw new Error("Филиал не найден в вашей компании");
  }
}

/** Первая страница выбора: куда отправлять, если филиалов ещё нет */
export const NO_BRANCHES_HINT = {
  title: "Нет филиалов",
  description: "Создайте первый филиал, чтобы продолжить.",
  actionHref: "/admin/branches/new",
  actionLabel: "Создать филиал",
} as const;
