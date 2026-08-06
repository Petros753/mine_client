"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { format, addDays, startOfWeek, endOfWeek, startOfDay, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { CalendarView } from "@/lib/calendar";
import type { UserRole } from "@prisma/client";

interface TopbarProps {
  /** yyyy-MM-dd выбранного дня */
  date: string;
  view: CalendarView;
  branches: Array<{ id: string; name: string }>;
  branchId?: string | null;
  role: UserRole;
  basePath: string;
  /** Если передан — кнопка открывает диалог, иначе ведёт на публичный виджет */
  onCreate?: () => void;
}

export function Topbar({
  date: dateStr,
  view,
  branches,
  branchId,
  role,
  basePath,
  onCreate,
}: TopbarProps) {
  const router = useRouter();
  const isAdmin = role === "OWNER" || role === "ADMIN";

  const today = startOfDay(new Date());
  const date = parseISO(dateStr);

  const periodLabel =
    view === "day"
      ? format(date, "d MMMM, EEEE", { locale: ru })
      : `${format(startOfWeek(date, { weekStartsOn: 1 }), "d MMMM", { locale: ru })} – ${format(
          endOfWeek(date, { weekStartsOn: 1 }),
          "d MMMM",
          { locale: ru }
        )}`;

  function navigate(delta: number) {
    const next = view === "day" ? addDays(date, delta) : addDays(date, delta * 7);
    router.push(`${basePath}?date=${format(next, "yyyy-MM-dd")}&view=${view}${branchId ? `&branchId=${branchId}` : ""}`);
  }

  function goToday() {
    router.push(`${basePath}?date=${format(today, "yyyy-MM-dd")}&view=${view}${branchId ? `&branchId=${branchId}` : ""}`);
  }

  function setView(next: CalendarView) {
    router.push(`${basePath}?date=${dateStr}&view=${next}${branchId ? `&branchId=${branchId}` : ""}`);
  }

  function setBranch(nextBranchId: string) {
    router.push(`${basePath}?date=${dateStr}&view=${view}&branchId=${nextBranchId}`);
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={goToday}>
          Сегодня
        </Button>
        <div className="flex items-center">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <h2 className="min-w-[180px] text-sm font-semibold capitalize">{periodLabel}</h2>
      </div>

      <div className="flex items-center gap-2">
        {(["day", "week"] as CalendarView[]).map((v) => (
          <Button
            key={v}
            variant={view === v ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setView(v)}
          >
            {v === "day" ? "День" : "Неделя"}
          </Button>
        ))}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger
              render={
                // span-обёртка: у disabled-кнопки не всплывают события мыши
                <span className="inline-flex">
                  <Button variant="ghost" size="sm" disabled>
                    Месяц
                  </Button>
                </span>
              }
            />
            <TooltipContent>В разработке</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="flex items-center gap-3">
        {isAdmin && branches.length > 1 && (
          <Select
            value={branchId ?? undefined}
            onValueChange={(value) => value && setBranch(value)}
          >
            <SelectTrigger className="h-8 w-[180px] text-xs">
              <SelectValue placeholder="Филиал" />
            </SelectTrigger>
            <SelectContent>
              {branches.map((branch) => (
                <SelectItem key={branch.id} value={branch.id}>
                  {branch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {onCreate ? (
          <Button size="sm" className="gap-1" onClick={onCreate}>
            <Plus className="h-4 w-4" />
            Новая запись
          </Button>
        ) : (
          <Button size="sm" className="gap-1" asChild>
            <Link href="/book">
              <Plus className="h-4 w-4" />
              Новая запись
            </Link>
          </Button>
        )}
      </div>
    </header>
  );
}
