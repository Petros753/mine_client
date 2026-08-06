"use client";

import { useState, useTransition } from "react";
import { Banknote, Clock, MessageSquare, Phone, Scissors, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { STATUS_DOT_STYLES, type CalendarAppointment } from "@/lib/calendar";
import { updateAppointmentStatus } from "@/app/admin/appointments/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AppointmentDialogProps {
  appointment: CalendarAppointment | null;
  onOpenChange: (open: boolean) => void;
}

export function AppointmentDialog({
  appointment,
  onOpenChange,
}: AppointmentDialogProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!appointment) return null;

  const actions = appointment.actions;

  function applyStatus(status: string) {
    if (!appointment) return;
    setError(null);

    const formData = new FormData();
    formData.set("appointmentId", appointment.id);
    formData.set("status", status);

    startTransition(async () => {
      try {
        await updateAppointmentStatus(formData);
        onOpenChange(false);
      } catch (cause) {
        setError(
          cause instanceof Error ? cause.message : "Не удалось сменить статус"
        );
      }
    });
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span
              className={cn(
                "h-2.5 w-2.5 shrink-0 rounded-full",
                STATUS_DOT_STYLES[appointment.status]
              )}
            />
            {appointment.clientName}
          </DialogTitle>
          <DialogDescription>{appointment.statusLabel}</DialogDescription>
        </DialogHeader>

        <dl className="space-y-3 text-sm">
          <Row icon={Clock} label="Время">
            {appointment.timeLabel}
            <span className="text-muted-foreground">
              {" "}
              · {appointment.serviceDurationMinutes} мин
            </span>
          </Row>
          <Row icon={Scissors} label="Услуга">
            {appointment.serviceName}
          </Row>
          <Row icon={User} label="Мастер">
            {appointment.employeeName}
          </Row>
          <Row icon={Phone} label="Контакты">
            {appointment.clientPhone}
            {appointment.clientEmail && (
              <span className="text-muted-foreground">
                {" "}
                · {appointment.clientEmail}
              </span>
            )}
          </Row>
          <Row icon={Banknote} label="Стоимость">
            {appointment.price.toLocaleString("ru-RU")} ₽
          </Row>
          {appointment.comment && (
            <Row icon={MessageSquare} label="Комментарий">
              {appointment.comment}
            </Row>
          )}
        </dl>

        {error && (
          <p
            role="alert"
            className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </p>
        )}

        <DialogFooter className="flex-wrap gap-2 sm:justify-start">
          {actions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Для этого статуса действий нет.
            </p>
          ) : (
            actions.map((action) => (
              <Button
                key={action.to}
                size="sm"
                variant={action.to === "CANCELLED" ? "outline" : "default"}
                disabled={pending}
                onClick={() => applyStatus(action.to)}
              >
                {action.label}
              </Button>
            ))
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="text-foreground">{children}</dd>
      </div>
    </div>
  );
}
