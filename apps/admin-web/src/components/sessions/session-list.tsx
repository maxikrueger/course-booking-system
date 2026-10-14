"use client";

import Link from "next/link";

import { formatDateTime } from "@/lib/format";
import type { AdminSession } from "@/lib/types";

const STATUS_LABEL: Record<AdminSession["status"], string> = {
  open: "offen",
  cancelled: "abgesagt",
  closed: "geschlossen",
};

const STATUS_BADGE: Record<AdminSession["status"], string> = {
  open: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  closed: "bg-slate-200 text-slate-700",
};

export function SessionList({ sessions }: { sessions: AdminSession[] }) {
  if (sessions.length === 0) {
    return (
      <p className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-600">
        Keine Termine.
      </p>
    );
  }

  const sorted = [...sessions].sort(
    (a, b) =>
      new Date(a.start_datetime).getTime() -
      new Date(b.start_datetime).getTime(),
  );

  return (
    <ul className="flex flex-col gap-2">
      {sorted.map((s) => (
        <li key={s.id}>
          <Link
            href={`/termine/${s.id}`}
            data-testid="session-link"
            className="flex flex-col gap-2 rounded-md border border-slate-200 bg-white p-4 hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium text-slate-900">{s.course_title}</p>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[s.status]}`}
              >
                {STATUS_LABEL[s.status]}
              </span>
            </div>
            <p className="text-sm text-slate-600">
              {formatDateTime(s.start_datetime)} · {s.location_name}
            </p>
            <p className="text-xs text-slate-500">
              {s.confirmed_bookings_count}/{s.max_participants} Teilnehmer
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
