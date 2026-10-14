"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { SessionList } from "@/components/sessions/session-list";
import { fetchAdminSessions } from "@/lib/admin-api";
import { cn } from "@/lib/utils";

function CalendarSkeleton() {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <div className="mb-4 flex items-center justify-between">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-8 w-48" />
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 35 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    </div>
  );
}

const SessionCalendar = dynamic(
  () =>
    import("@/components/sessions/session-calendar").then(
      (m) => m.SessionCalendar,
    ),
  {
    ssr: false,
    loading: () => <CalendarSkeleton />,
  },
);

type ViewMode = "calendar" | "list";

function useDefaultViewMode(): ViewMode {
  const [mode, setMode] = useState<ViewMode>("calendar");
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 767px)");
    if (mq.matches) setMode("list");
  }, []);
  return mode;
}

export default function TermineCalendarPage() {
  const [statusFilter, setStatusFilter] = useState<string>("");
  const initialMode = useDefaultViewMode();
  const [view, setView] = useState<ViewMode>(initialMode);

  useEffect(() => {
    setView(initialMode);
  }, [initialMode]);

  const sessionsQuery = useQuery({
    queryKey: ["admin", "sessions", statusFilter],
    queryFn: () =>
      fetchAdminSessions({
        status: statusFilter || undefined,
        page_size: 200,
      }),
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Termine</h1>
          <p className="text-sm text-slate-600">
            Klicken zum Bearbeiten.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div
            role="tablist"
            aria-label="Ansicht"
            className="inline-flex rounded-md border border-slate-300 bg-white p-0.5"
          >
            <button
              type="button"
              role="tab"
              aria-selected={view === "calendar"}
              onClick={() => setView("calendar")}
              className={cn(
                "rounded px-3 py-1 text-sm font-medium",
                view === "calendar"
                  ? "bg-slate-900 text-white"
                  : "text-slate-700 hover:bg-slate-100",
              )}
            >
              Kalender
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={view === "list"}
              onClick={() => setView("list")}
              className={cn(
                "rounded px-3 py-1 text-sm font-medium",
                view === "list"
                  ? "bg-slate-900 text-white"
                  : "text-slate-700 hover:bg-slate-100",
              )}
            >
              Liste
            </button>
          </div>
          <Select
            className="w-44"
            aria-label="Status-Filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Alle Status</option>
            <option value="open">offen</option>
            <option value="cancelled">abgesagt</option>
            <option value="closed">geschlossen</option>
          </Select>
          <Link href="/termine/neu">
            <Button>+ Neuer Termin</Button>
          </Link>
        </div>
      </div>

      {sessionsQuery.isLoading || !sessionsQuery.data ? (
        <CalendarSkeleton />
      ) : view === "list" ? (
        <SessionList sessions={sessionsQuery.data.results} />
      ) : (
        <SessionCalendar sessions={sessionsQuery.data.results} />
      )}
    </div>
  );
}
