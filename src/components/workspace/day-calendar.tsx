"use client";

import { useEffect, useState } from "react";
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

interface DayCalendarProps {
  /** yyyy-MM-dd — день, который показывает сетка */
  date: string;
  /** yyyy-MM-dd сегодняшнего дня по часам сервера */
  today: string;
  employees: CalendarEmployee[];
  appointments: CalendarAppointment[];
  onPickSlot: (slot: NewAppointmentSlot) => void;
  onPickAppointment: (appointment: CalendarAppointment) => void;
}

export function DayCalendar({
  date,
  today,
  employees,
  appointments,
  onPickSlot,
  onPickAppointment,
}: DayCalendarProps) {
  if (employees.length === 0) {
    return (
      <EmptyState
        title="В филиале нет мастеров"
        description="Добавьте сотрудника, и в календаре появится его колонка."
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
            gridTemplateColumns: `4rem repeat(${employees.length}, minmax(11rem, 1fr))`,
          }}
        >
          {/* Шапка с мастерами — липнет при вертикальной прокрутке */}
          <div className="sticky top-0 z-20 border-b border-r border-border bg-card" />
          {employees.map((employee) => (
            <div
              key={employee.id}
              className="sticky top-0 z-20 border-b border-r border-border bg-card px-3 py-2 last:border-r-0"
            >
              <p className="truncate text-sm font-medium text-foreground">
                {employee.name}
              </p>
              {employee.position && (
                <p className="truncate text-xs text-muted-foreground">
                  {employee.position}
                </p>
              )}
            </div>
          ))}

          {/* Шкала времени */}
          <div className="border-r border-border bg-card">
            {SLOT_LABELS.map((label, index) => (
              <div
                key={label}
                className="relative border-b border-border/50"
                style={{ height: SLOT_HEIGHT_PX }}
              >
                {/* Подпись внутри своего получаса, а не на границе:
                    иначе первая уезжает под липкую шапку */}
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

          {/* Колонки мастеров */}
          {employees.map((employee) => (
            <EmployeeColumn
              key={employee.id}
              employee={employee}
              date={date}
              today={today}
              appointments={appointments.filter(
                (appointment) => appointment.employeeId === employee.id
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

function EmployeeColumn({
  employee,
  date,
  today,
  appointments,
  onPickSlot,
  onPickAppointment,
}: {
  employee: CalendarEmployee;
  date: string;
  today: string;
  appointments: CalendarAppointment[];
  onPickSlot: (slot: NewAppointmentSlot) => void;
  onPickAppointment: (appointment: CalendarAppointment) => void;
}) {
  const positioned = layoutAppointments(appointments);

  return (
    <div
      className="relative border-r border-border last:border-r-0"
      style={{ height: SLOT_COUNT * SLOT_HEIGHT_PX }}
    >
      {/* Пустые слоты: клик открывает создание записи */}
      {SLOT_LABELS.map((label) => (
        <button
          key={label}
          type="button"
          onClick={() =>
            onPickSlot({ employeeId: employee.id, date, time: label })
          }
          aria-label={`Новая запись: ${employee.name}, ${label}`}
          className="block w-full border-b border-border/50 transition-colors hover:bg-accent/60"
          style={{ height: SLOT_HEIGHT_PX }}
        />
      ))}

      <CurrentTimeLine date={date} today={today} />

      {/* Блоки записей поверх сетки */}
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
              {appointment.serviceName}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Линия текущего времени — только на сегодняшней дате */
function CurrentTimeLine({ date, today }: { date: string; today: string }) {
  // Считаем после монтирования: на сервере «сейчас» отличается от клиента
  const [minutes, setMinutes] = useState<number | null>(null);

  useEffect(() => {
    if (date !== today) return;

    const update = () => {
      const now = new Date();
      setMinutes(now.getHours() * 60 + now.getMinutes());
    };

    update();
    const timer = setInterval(update, 60_000);
    return () => clearInterval(timer);
  }, [date, today]);

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

