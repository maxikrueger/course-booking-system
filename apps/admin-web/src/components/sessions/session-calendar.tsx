"use client";

import { Calendar, dateFnsLocalizer, type View } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { de } from "date-fns/locale";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import "react-big-calendar/lib/css/react-big-calendar.css";

import type { AdminSession } from "@/lib/types";

const locales = { de };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { locale: de }),
  getDay,
  locales,
});

const MESSAGES = {
  date: "Datum",
  time: "Uhrzeit",
  event: "Termin",
  allDay: "Ganztägig",
  week: "Woche",
  work_week: "Arbeitswoche",
  day: "Tag",
  month: "Monat",
  previous: "Zurück",
  next: "Vor",
  yesterday: "Gestern",
  tomorrow: "Morgen",
  today: "Heute",
  agenda: "Agenda",
  noEventsInRange: "Keine Termine im Zeitraum.",
  showMore: (n: number) => `+${n} mehr`,
};

type CalendarEvent = {
  id: number;
  title: string;
  start: Date;
  end: Date;
  resource: AdminSession;
};

export function SessionCalendar({ sessions }: { sessions: AdminSession[] }) {
  const router = useRouter();
  const [view, setView] = useState<View>("month");
  const [date, setDate] = useState<Date>(new Date());

  const events: CalendarEvent[] = useMemo(
    () =>
      sessions.map((s) => ({
        id: s.id,
        title: `${s.course_title} (${s.location_name}) · ${s.confirmed_bookings_count}/${s.max_participants}`,
        start: new Date(s.start_datetime),
        end: new Date(s.end_datetime),
        resource: s,
      })),
    [sessions],
  );

  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <div style={{ height: 700 }}>
        <Calendar
          culture="de"
          localizer={localizer}
          messages={MESSAGES}
          events={events}
          startAccessor="start"
          endAccessor="end"
          view={view}
          onView={(v) => setView(v)}
          date={date}
          onNavigate={(d) => setDate(d)}
          views={["month", "week", "day", "agenda"]}
          onSelectEvent={(event) => {
            const e = event as CalendarEvent;
            router.push(`/termine/${e.id}`);
          }}
          eventPropGetter={(event) => {
            const e = event as CalendarEvent;
            const status = e.resource.status;
            const bg =
              status === "cancelled"
                ? "#fecaca"
                : status === "closed"
                  ? "#e2e8f0"
                  : "#0f172a";
            const color = status === "open" ? "#f8fafc" : "#0f172a";
            return { style: { backgroundColor: bg, color, border: "none" } };
          }}
        />
      </div>
    </div>
  );
}
