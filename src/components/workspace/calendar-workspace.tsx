"use client";

import { useState } from "react";
import {
  DAY_END_MINUTES,
  DAY_START_MINUTES,
  SLOT_MINUTES,
  type CalendarAppointment,
  type CalendarEmployee,
  type CalendarService,
  type CalendarView,
} from "@/lib/calendar";
import { Topbar } from "@/components/workspace/topbar";
import { DayCalendar } from "@/components/workspace/day-calendar";
import { WeekCalendar } from "@/components/workspace/week-calendar";
import { AppointmentDialog } from "@/components/workspace/appointment-dialog";
import {
  NewAppointmentDialog,
  type NewAppointmentSlot,
} from "@/components/workspace/new-appointment-dialog";
import type { UserRole } from "@prisma/client";

interface CalendarWorkspaceProps {
  /** yyyy-MM-dd выбранного дня */
  date: string;
  /** yyyy-MM-dd сегодняшнего дня по часам сервера */
  today: string;
  view: CalendarView;
  role: UserRole;
  branchId: string;
  branches: Array<{ id: string; name: string }>;
  employees: CalendarEmployee[];
  services: CalendarService[];
  appointments: CalendarAppointment[];
}

export function CalendarWorkspace({
  date,
  today,
  view,
  role,
  branchId,
  branches,
  employees,
  services,
  appointments,
}: CalendarWorkspaceProps) {
  const [selected, setSelected] = useState<CalendarAppointment | null>(null);
  const [newSlot, setNewSlot] = useState<NewAppointmentSlot | null>(null);

  /** «Новая запись» из шапки: первый мастер и ближайший свободный слот */
  function openBlankSlot() {
    if (employees.length === 0) return;
    setNewSlot({
      employeeId: employees[0].id,
      date,
      time: defaultSlotTime(date === today),
    });
  }

  return (
    <>
      <Topbar
        date={date}
        view={view}
        branches={branches}
        branchId={branchId}
        role={role}
        basePath="/admin"
        onCreate={employees.length > 0 ? openBlankSlot : undefined}
      />

      {view === "week" ? (
        <WeekCalendar
          date={date}
          today={today}
          employees={employees}
          appointments={appointments}
          onPickSlot={setNewSlot}
          onPickAppointment={setSelected}
        />
      ) : (
        <DayCalendar
          date={date}
          today={today}
          employees={employees}
          appointments={appointments}
          onPickSlot={setNewSlot}
          onPickAppointment={setSelected}
        />
      )}

      <AppointmentDialog
        appointment={selected}
        onOpenChange={(open) => !open && setSelected(null)}
      />
      <NewAppointmentDialog
        slot={newSlot}
        branchId={branchId}
        employees={employees}
        services={services}
        onOpenChange={(open) => !open && setNewSlot(null)}
      />
    </>
  );
}

/** Ближайший слот сетки: для сегодня — от текущего времени, иначе начало дня */
function defaultSlotTime(isToday: boolean): string {
  let minutes = DAY_START_MINUTES;

  if (isToday) {
    const now = new Date();
    const current = now.getHours() * 60 + now.getMinutes();
    const rounded = Math.ceil(current / SLOT_MINUTES) * SLOT_MINUTES;
    if (rounded > DAY_START_MINUTES && rounded < DAY_END_MINUTES) {
      minutes = rounded;
    }
  }

  const hours = Math.floor(minutes / 60);
  return `${String(hours).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}
