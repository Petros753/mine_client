"use client";

import { useEffect, useState } from "react";
import { format, addDays, startOfWeek, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  DAY_END_MINUTES,
  DAY_START_MINUTES,
  SLOT_COUNT,
  SLOT_HEIGHT_PX,
  SLOT_LABELS,
  STATUS_BLOCK_STYLES,
  layoutAppointments,
  minutesToOffset,
  type CalendarAppointment,
  type CalendarEmployee,
} from "@/lib/calendar";
import type { NewAppointmentSlot } from "@/components/workspace/new-appointment-dialog";
import { EmptyState } from "@/components/workspace/empty-state";

interface WeekCalendarProps {
  /** yyyy-MM-dd любого дня внутри отображаемой недели */
  date: string;
  /** yyyy-MM-dd сегодняшнего дня */
  today: string;
  employees: CalendarEmployee[];
  appointments: CalendarAppointment[];
  onPickSlot: (slot: NewAppointmentSlot) => void;
  onPickAppointment: (appointment: CalendarAppointment) => void;
}

export function WeekCalendar({
  date,
  today,
  employees,
  appointments,
  onPickSlot,
  onPickAppointment,
}: WeekCalendarProps) {
  const weekStart = startOfWeek(parseISO(date), { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  if (employees.length === 0) {
    return (
      <EmptyState
        title="В филиале нет мастеров"
        description="Добавьте сотрудника, и в календаре появятся колонки."
        actionHref="/admin/employees/new"
        actionLabel="Добавить сотрудника"
      />
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex-1 overflow-auto">
        <div
          className="grid min-w-max"
          style={{
            gridTemplateColumns: `4rem repeat(7, minmax(13rem, 1fr))`,
          }}
        >
          {/* Липкая шапка с днями недели */}
          <div className="sticky top-0 z-20 border-b border-r border-border bg-card" />
          {days.map((day) => {
            const isToday = format(day, "yyyy-MM-dd") === today;
            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "sticky top-0 z-20 border-b border-r border-border bg-card px-3 py-2 text-center last:border-r-0",
                  isToday && "bg-primary/10"
                )}
              >
                <p className="text-xs text-muted-foreground">
                  {format(day, "EEEE", { locale: ru })}
                </p>
                <p
                  className={cn(
                    "text-sm font-semibold",
                    isToday ? "text-primary" : "text-foreground"
                  )}
                >
                  {format(day, "d MMMM", { locale: ru })}
                </p>
              </div>
            );
          })}

          {/* Шкала времени */}
          <div className="border-r border-border bg-card">
            {SLOT_LABELS.map((label, index) => (
              <div
                key={label}
                className="relative border-b border-border/50"
                style={{ height: SLOT_HEIGHT_PX }}
              >
                <span
                  className={cn(
                    "absolute right-2 top-1 text-[11px] tabular-nums",
                    index % 2 === 0
                      ? "text-muted-foreground"
                      : "text-muted-foreground/50"
                  )}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>

          {/* Колонки дней */}
          {days.map((day) => (
            <DayColumn
              key={day.toISOString()}
              day={day}
              today={today}
              employees={employees}
              appointments={appointments.filter(
                (a) => a.dayKey === format(day, "yyyy-MM-dd")
              )}
              onPickSlot={onPickSlot}
              onPickAppointment={onPickAppointment}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function DayColumn({
  day,
  today,
  employees,
  appointments,
  onPickSlot,
  onPickAppointment,
}: {
  day: Date;
  today: string;
  employees: CalendarEmployee[];
  appointments: CalendarAppointment[];
  onPickSlot: (slot: NewAppointmentSlot) => void;
  onPickAppointment: (appointment: CalendarAppointment) => void;
}) {
  const dayKey = format(day, "yyyy-MM-dd");
  const positioned = layoutAppointments(appointments);
  const defaultEmployeeId = employees[0]?.id ?? "";

  return (
    <div
      className="relative border-r border-border last:border-r-0"
      style={{ height: SLOT_COUNT * SLOT_HEIGHT_PX }}
    >
      {SLOT_LABELS.map((label) => (
        <button
          key={label}
          type="button"
          onClick={() =>
            onPickSlot({ employeeId: defaultEmployeeId, date: dayKey, time: label })
          }
          aria-label={`Новая запись: ${dayKey}, ${label}`}
          className="block w-full border-b border-border/50 transition-colors hover:bg-accent/60"
          style={{ height: SLOT_HEIGHT_PX }}
        />
      ))}

      <CurrentTimeLine dayKey={dayKey} today={today} />

      {positioned.map(({ appointment, lane, lanes }) => {
        const top = minutesToOffset(
          Math.max(appointment.startMinutes, DAY_START_MINUTES)
        );
        const bottom = minutesToOffset(
          Math.min(appointment.endMinutes, DAY_END_MINUTES)
        );
        const width = 100 / lanes;

        return (
          <button
            key={appointment.id}
            type="button"
            onClick={() => onPickAppointment(appointment)}
            className={cn(
              "absolute overflow-hidden rounded-md border-l-4 px-2 py-1 text-left transition-colors",
              STATUS_BLOCK_STYLES[appointment.status],
              appointment.status === "CANCELLED" && "line-through"
            )}
            style={{
              top,
              height: Math.max(bottom - top - 2, 20),
              left: `calc(${lane * width}% + 2px)`,
              width: `calc(${width}% - 4px)`,
            }}
          >
            <span className="block truncate text-xs font-medium">
              {appointment.timeLabel}
            </span>
            <span className="block truncate text-xs">
              {appointment.clientName}
            </span>
            <span className="block truncate text-[11px] opacity-80">
              {appointment.employeeName} · {appointment.serviceName}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Линия текущего времени — только в колонке сегодняшнего дня */
function CurrentTimeLine({ dayKey, today }: { dayKey: string; today: string }) {
  const [minutes, setMinutes] = useState<number | null>(null);

  useEffect(() => {
    if (dayKey !== today) return;

    const update = () => {
      const now = new Date();
      setMinutes(now.getHours() * 60 + now.getMinutes());
    };

    update();
    const timer = setInterval(update, 60_000);
    return () => clearInterval(timer);
  }, [dayKey, today]);

  if (
    minutes === null ||
    minutes < DAY_START_MINUTES ||
    minutes > DAY_END_MINUTES
  ) {
    return null;
  }

  return (
    <div
      className="pointer-events-none absolute inset-x-0 z-10 border-t-2 border-primary"
      style={{ top: minutesToOffset(minutes) }}
    >
      <span className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-primary" />
    </div>
  );
}
