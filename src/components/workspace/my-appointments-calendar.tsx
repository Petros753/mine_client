"use client";

import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export interface MyAppointment {
  id: string;
  startAt: string;
  clientName: string;
  clientPhone?: string | null;
  serviceName: string;
  durationMinutes: number;
  price: number;
  statusLabel: string;
  statusVariant: "default" | "secondary" | "destructive" | "outline";
}

interface MyAppointmentsCalendarProps {
  today: MyAppointment[];
  tomorrow: MyAppointment[];
  branchName: string;
  position?: string | null;
}

export function MyAppointmentsCalendar({
  today,
  tomorrow,
  branchName,
  position,
}: MyAppointmentsCalendarProps) {
  const hasAny = today.length > 0 || tomorrow.length > 0;

  if (!hasAny) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="text-center">
          <h2 className="text-lg font-medium text-foreground">Нет записей</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            У вас нет предстоящих записей на сегодня и завтра.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <DayCard title="Сегодня" appointments={today} />
      <DayCard title="Завтра" appointments={tomorrow} />
    </div>
  );
}

function DayCard({ title, appointments }: { title: string; appointments: MyAppointment[] }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {appointments.length === 0 ? (
          <p className="px-6 py-4 text-sm text-muted-foreground">Записей нет</p>
        ) : (
          <ul className="divide-y divide-border">
            {appointments.map((apt) => (
              <li key={apt.id} className="px-6 py-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {format(new Date(apt.startAt), "HH:mm", { locale: ru })}
                      </span>
                      <Badge variant={apt.statusVariant} className="text-xs">
                        {apt.statusLabel}
                      </Badge>
                    </div>
                    <p className="mt-1 truncate text-sm text-foreground">
                      {apt.clientName}
                      {apt.clientPhone && (
                        <span className="ml-2 text-muted-foreground">· {apt.clientPhone}</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {apt.serviceName} · {apt.durationMinutes} мин
                    </p>
                  </div>
                  <div className="shrink-0 text-sm font-medium text-foreground">
                    {Number(apt.price).toLocaleString("ru-RU")} ₽
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
