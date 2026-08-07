"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday } from "date-fns";
import { ru } from "date-fns/locale";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Users,
  UserCircle,
  Scissors,
  Building2,
  BarChart3,
  Boxes,
  Globe,
  Settings,
  Menu,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { UserRole } from "@prisma/client";

interface SidebarProps {
  user: {
    name?: string | null;
    email?: string | null;
    role: UserRole;
  };
  employees?: Array<{ id: string; firstName: string; lastName?: string | null }>;
  /** Филиалы, доступные пользователю — из них собирается ссылка на виджет */
  branches?: Array<{ id: string; name: string }>;
  companyName?: string;
  onSignOut: () => void;
}

export function Sidebar({
  user,
  employees = [],
  branches = [],
  companyName,
  onSignOut,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [monthOffset, setMonthOffset] = useState(0);
  const [employeesOpen, setEmployeesOpen] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const today = new Date();
  const currentMonth = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const monthDays = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const isAdmin = user.role === "OWNER" || user.role === "ADMIN";

  // Виджет живёт по адресу /book/[branchId] — без филиала ссылка ведёт в 404,
  // поэтому берём филиал из адреса (его переключает topbar), иначе первый
  const requestedBranchId = searchParams.get("branchId");
  const bookingBranchId =
    branches.find((branch) => branch.id === requestedBranchId)?.id ??
    branches[0]?.id;

  const navItems = [
    ...(isAdmin
      ? [
          { href: "/admin", icon: CalendarDays, label: "Журнал записей" },
          { href: "/admin/employees", icon: Users, label: "Сотрудники" },
          { href: "/admin/services", icon: Scissors, label: "Услуги" },
          { href: "/admin/inventory", icon: Boxes, label: "Склад" },
          { href: "/admin/branches", icon: Building2, label: "Филиалы" },
        ]
      : [{ href: "/my-appointments", icon: CalendarDays, label: "Мой календарь" }]),
    { href: "/dashboard", icon: BarChart3, label: "Аналитика" },
    // Пока нет ни одного филиала, вести некуда — пункт скрываем
    ...(bookingBranchId
      ? [
          {
            href: `/book/${bookingBranchId}`,
            icon: Globe,
            label: "Онлайн-запись",
            external: true,
          },
        ]
      : []),
    // Раздела настроек пока нет — пункт-заглушка, некликабельный
    { href: "#", icon: Settings, label: "Настройки", disabled: true },
  ];

  /**
   * Активен только самый длинный подходящий пункт: иначе «Журнал записей»
   * с href="/admin" подсвечивался бы на любом /admin/* вместе с разделом.
   */
  const activeHref = navItems
    .filter((item) => !item.external && item.href.startsWith("/"))
    .filter(
      (item) =>
        pathname === item.href || pathname.startsWith(`${item.href}/`)
    )
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-r border-sidebar-border bg-sidebar transition-all duration-200",
        collapsed ? "w-16" : "w-[260px]"
      )}
    >
      <div className="flex h-14 items-center justify-between px-3">
        {!collapsed && (
          <Link href={isAdmin ? "/admin" : "/my-appointments"} className="truncate text-sm font-semibold text-sidebar-foreground">
            {companyName || "Booking"}
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          onClick={() => setCollapsed((v) => !v)}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {!collapsed && (
        <>
          <div className="px-3 pb-2">
            <div className="rounded-md border border-sidebar-border bg-sidebar-accent/50 p-2">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-sidebar-foreground">
                  {format(currentMonth, "LLLL yyyy", { locale: ru })}
                </span>
                <div className="flex gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 text-sidebar-foreground"
                    onClick={() => setMonthOffset((v) => v - 1)}
                  >
                    <ChevronLeft className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 text-sidebar-foreground"
                    onClick={() => setMonthOffset((v) => v + 1)}
                  >
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-0.5 text-center">
                {["П", "В", "С", "Ч", "П", "С", "В"].map((d) => (
                  <span key={d} className="text-[10px] text-muted-foreground">
                    {d}
                  </span>
                ))}
                {monthDays.map((day) => {
                  const active = pathname.startsWith("/admin") && pathname.includes(format(day, "yyyy-MM-dd"));
                  return (
                    <Link
                      key={day.toISOString()}
                      href={`/admin?date=${format(day, "yyyy-MM-dd")}`}
                      className={cn(
                        "rounded text-[10px] leading-5 text-sidebar-foreground hover:bg-sidebar-accent",
                        isToday(day) && "bg-primary font-semibold text-primary-foreground",
                        active && "ring-1 ring-primary"
                      )}
                    >
                      {format(day, "d")}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          <Separator className="my-2 bg-sidebar-border" />
        </>
      )}

      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-2">
        {navItems.map((item) => (
          <NavItem
            key={item.href}
            item={item}
            active={item.href === activeHref}
            collapsed={collapsed}
          />
        ))}

        {isAdmin && !collapsed && employees.length > 0 && (
          <div className="pt-2">
            <button
              onClick={() => setEmployeesOpen((v) => !v)}
              className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <span className="flex items-center gap-2">
                <UserCircle className="h-4 w-4" />
                Сотрудники
              </span>
              <ChevronDown className={cn("h-3 w-3 transition-transform", employeesOpen && "rotate-180")} />
            </button>
            {employeesOpen && (
              <div className="mt-1 space-y-0.5 pl-7">
                {employees.map((employee) => (
                  <Link
                    key={employee.id}
                    href={`/admin/appointments?employeeId=${employee.id}`}
                    className="block truncate rounded-md px-2 py-1 text-xs text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  >
                    {employee.firstName} {employee.lastName || ""}
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="bg-primary text-xs text-primary-foreground">
              {user.name?.slice(0, 2).toUpperCase() || user.email?.slice(0, 2).toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-sidebar-foreground">{user.name || user.email}</p>
              <p className="truncate text-[10px] text-muted-foreground">{user.email}</p>
            </div>
          )}
          {!collapsed && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              onClick={onSignOut}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </aside>
  );
}

function NavItem({
  item,
  active,
  collapsed,
}: {
  item: {
    href: string;
    icon: React.ElementType;
    label: string;
    external?: boolean;
    /** Раздел ещё не сделан: показываем неактивным с подсказкой */
    disabled?: boolean;
  };
  active: boolean;
  collapsed: boolean;
}) {
  const content = (
    <>
      <item.icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </>
  );

  const baseClassName =
    "flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-colors";

  if (item.disabled) {
    // Тот же приём, что и у кнопки «Месяц» в topbar: пункт видно, но он
    // явно неактивен и объясняет почему
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger
            render={
              <span
                aria-disabled="true"
                className={cn(
                  baseClassName,
                  "cursor-not-allowed text-sidebar-foreground/40"
                )}
              >
                {content}
              </span>
            }
          />
          <TooltipContent side="right">В разработке</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const className = cn(
    baseClassName,
    active
      ? "bg-sidebar-primary text-sidebar-primary-foreground"
      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
  );

  if (item.external) {
    return (
      <a href={item.href} target="_blank" rel="noreferrer" className={className}>
        {content}
      </a>
    );
  }

  return (
    <Link href={item.href} className={className}>
      {content}
    </Link>
  );
}
