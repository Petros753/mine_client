"use client";

import { useActionState, useEffect } from "react";
import { format, parse } from "date-fns";
import { ru } from "date-fns/locale";
import {
  createAppointment,
  type CreateAppointmentState,
} from "@/app/admin/appointments/actions";
import type { CalendarEmployee, CalendarService } from "@/lib/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/** Выбранная в сетке пустая ячейка */
export interface NewAppointmentSlot {
  employeeId: string;
  /** yyyy-MM-dd */
  date: string;
  /** HH:mm */
  time: string;
}

interface NewAppointmentDialogProps {
  slot: NewAppointmentSlot | null;
  branchId: string;
  employees: CalendarEmployee[];
  services: CalendarService[];
  onOpenChange: (open: boolean) => void;
}

export function NewAppointmentDialog({
  slot,
  branchId,
  employees,
  services,
  onOpenChange,
}: NewAppointmentDialogProps) {
  const [state, formAction, pending] = useActionState<
    CreateAppointmentState,
    FormData
  >(createAppointment, {});

  // Запись создана — закрываем диалог
  useEffect(() => {
    if (state.ok) {
      onOpenChange(false);
    }
  }, [state.ok, onOpenChange]);

  if (!slot) return null;

  const slotDate = parse(slot.date, "yyyy-MM-dd", new Date());
  const employee = employees.find((item) => item.id === slot.employeeId);

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Новая запись</DialogTitle>
          <DialogDescription>
            {format(slotDate, "d MMMM, EEEE", { locale: ru })} · {slot.time}
            {employee ? ` · ${employee.name}` : ""}
          </DialogDescription>
        </DialogHeader>

        {/* key сбрасывает поля формы при выборе другой ячейки */}
        <form
          key={`${slot.employeeId}-${slot.date}-${slot.time}`}
          action={formAction}
          className="space-y-4"
        >
          <input type="hidden" name="branchId" value={branchId} />
          <input
            type="hidden"
            name="startAt"
            value={`${slot.date}T${slot.time}`}
          />

          <Field label="Услуга" htmlFor="serviceId">
            <select
              id="serviceId"
              name="serviceId"
              required
              defaultValue={services[0]?.id ?? ""}
              className={selectClassName}
            >
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name} · {service.durationMinutes} мин ·{" "}
                  {service.price.toLocaleString("ru-RU")} ₽
                </option>
              ))}
            </select>
          </Field>

          <Field label="Мастер" htmlFor="employeeId">
            <select
              id="employeeId"
              name="employeeId"
              required
              defaultValue={slot.employeeId}
              className={selectClassName}
            >
              {employees.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Имя клиента" htmlFor="firstName">
              <Input id="firstName" name="firstName" required placeholder="Иван" />
            </Field>
            <Field label="Фамилия" htmlFor="lastName" optional>
              <Input id="lastName" name="lastName" placeholder="Петров" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Телефон" htmlFor="phone">
              <Input
                id="phone"
                name="phone"
                type="tel"
                required
                placeholder="+7 (999) 123-45-67"
              />
            </Field>
            <Field label="Email" htmlFor="email" optional>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="ivan@example.com"
              />
            </Field>
          </div>

          <Field label="Комментарий" htmlFor="comment" optional>
            <Input id="comment" name="comment" placeholder="Пожелания клиента" />
          </Field>

          {state.error && (
            <p
              role="alert"
              className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {state.error}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Отмена
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Создаём…" : "Создать запись"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const selectClassName =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

function Field({
  label,
  htmlFor,
  optional,
  children,
}: {
  label: string;
  htmlFor: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
        {label}
        {!optional && " *"}
      </label>
      {children}
    </div>
  );
}
