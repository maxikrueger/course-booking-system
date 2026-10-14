import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { DashboardStats } from "@/lib/types";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("de-CH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function DashboardView({ stats }: { stats: DashboardStats | null }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-slate-600">
          Übersicht über kommende Termine und neue Buchungen.
        </p>
      </div>

      {stats === null ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-600">
              Statistik-Endpoint noch nicht verfügbar.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Aktive Kurse" value={stats.totals.courses} />
            <StatCard
              label="Kommende Termine"
              value={stats.totals.upcoming_sessions}
            />
            <StatCard
              label="Buchungen (7 Tage)"
              value={stats.totals.bookings_last_7_days}
            />
            <StatCard
              label="Bestätigte Buchungen"
              value={stats.totals.confirmed_bookings}
            />
          </section>

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Kommende Termine</CardTitle>
                <CardDescription>
                  Nächste Sessions, Status offen.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {stats.upcoming_sessions.length === 0 ? (
                  <p className="text-sm text-slate-600">Keine Termine.</p>
                ) : (
                  <ul className="flex flex-col gap-3">
                    {stats.upcoming_sessions.map((s) => (
                      <li
                        key={s.id}
                        className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3 last:border-b-0 last:pb-0"
                      >
                        <div>
                          <p className="font-medium">{s.course_title}</p>
                          <p className="text-xs text-slate-500">
                            {formatDateTime(s.start_datetime)} ·{" "}
                            {s.location_name}
                          </p>
                        </div>
                        <div className="text-xs text-slate-500">
                          {s.confirmed_bookings_count}/{s.max_participants}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Neue Buchungen</CardTitle>
                <CardDescription>Letzte 7 Tage.</CardDescription>
              </CardHeader>
              <CardContent>
                {stats.recent_bookings.length === 0 ? (
                  <p className="text-sm text-slate-600">
                    Keine neuen Buchungen.
                  </p>
                ) : (
                  <ul className="flex flex-col gap-3">
                    {stats.recent_bookings.map((b) => (
                      <li
                        key={b.id}
                        className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3 last:border-b-0 last:pb-0"
                      >
                        <div>
                          <p className="font-medium">{b.full_name}</p>
                          <p className="text-xs text-slate-500">
                            {b.booking_number} · {b.course_title}
                          </p>
                        </div>
                        <div
                          className={
                            b.status === "confirmed"
                              ? "text-xs font-medium text-green-700"
                              : "text-xs font-medium text-red-700"
                          }
                        >
                          {b.status === "confirmed" ? "bestätigt" : "storniert"}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 pt-6">
        <span className="text-sm text-slate-600">{label}</span>
        <span className="text-3xl font-semibold">{value}</span>
      </CardContent>
    </Card>
  );
}
