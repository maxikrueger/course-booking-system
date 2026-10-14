"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { SessionForm } from "@/components/sessions/session-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  FormCardSkeleton,
  PageHeaderSkeleton,
} from "@/components/ui/skeletons";
import { ApiError } from "@/lib/api";
import {
  cancelAdminSession,
  fetchAdminBookings,
  fetchAdminCourses,
  fetchAdminLocations,
  fetchAdminSession,
  sessionParticipantsCsvUrl,
  updateAdminSession,
} from "@/lib/admin-api";
import { formatDateTime } from "@/lib/format";
import type { AdminSession, AdminSessionPayload } from "@/lib/types";

export default function EditSessionPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const sessionQuery = useQuery({
    queryKey: ["admin", "session", id],
    queryFn: () => fetchAdminSession(id),
    enabled: Number.isFinite(id),
  });
  const coursesQuery = useQuery({
    queryKey: ["admin", "courses", "all"],
    queryFn: () => fetchAdminCourses({ page_size: 200 }),
  });
  const locationsQuery = useQuery({
    queryKey: ["admin", "locations"],
    queryFn: fetchAdminLocations,
  });
  const bookingsQuery = useQuery({
    queryKey: ["admin", "bookings", "session", id],
    queryFn: () => fetchAdminBookings({ session: id, page_size: 100 }),
    enabled: Number.isFinite(id),
  });

  const update = useMutation({
    mutationFn: (payload: AdminSessionPayload) =>
      updateAdminSession(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "sessions"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "session", id] });
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setError(JSON.stringify(err.body));
      } else {
        setError("Speichern fehlgeschlagen.");
      }
    },
  });

  const cancel = useMutation({
    mutationFn: () => cancelAdminSession(id),
    // Optimistic Update: Status in Caches sofort auf "cancelled" setzen.
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["admin", "session", id] });
      const previous = queryClient.getQueryData<AdminSession>([
        "admin",
        "session",
        id,
      ]);
      if (previous) {
        queryClient.setQueryData<AdminSession>(["admin", "session", id], {
          ...previous,
          status: "cancelled",
        });
      }
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(["admin", "session", id], ctx.previous);
      }
      setError("Absagen fehlgeschlagen.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "sessions"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "session", id] });
      queryClient.invalidateQueries({
        queryKey: ["admin", "bookings", "session", id],
      });
    },
  });

  if (!sessionQuery.data || !coursesQuery.data || !locationsQuery.data) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeaderSkeleton />
        <FormCardSkeleton rows={4} />
      </div>
    );
  }

  const session = sessionQuery.data;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Termin bearbeiten</h1>
          <p className="text-sm text-slate-600">
            {session.course_title} · {session.location_name} ·{" "}
            {formatDateTime(session.start_datetime)}
          </p>
          <p className="text-xs text-slate-500">
            Status: {session.status} · {session.confirmed_bookings_count}/
            {session.max_participants} bestätigt
          </p>
        </div>
        <div className="flex gap-2">
          {session.status !== "cancelled" && (
            <Button
              variant="destructive"
              onClick={() => {
                if (
                  confirm(
                    "Termin wirklich absagen? Alle Buchungen werden storniert.",
                  )
                ) {
                  setError(null);
                  cancel.mutate();
                }
              }}
              disabled={cancel.isPending}
            >
              Termin absagen
            </Button>
          )}
        </div>
      </div>

      <SessionForm
        initial={session}
        courses={coursesQuery.data.results}
        locations={locationsQuery.data}
        onSubmit={(payload) => {
          setError(null);
          update.mutate(payload);
        }}
        submitting={update.isPending}
        error={error}
      />

      <Card>
        <CardContent className="flex flex-col gap-3 pt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Teilnehmer</h2>
            {session.confirmed_bookings_count > 0 ? (
              <a
                data-testid="participants-csv-link"
                href={sessionParticipantsCsvUrl(session.id)}
                download
                className="inline-flex items-center justify-center rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-100"
              >
                Teilnehmerliste herunterladen (CSV)
              </a>
            ) : (
              <span
                aria-disabled="true"
                title="Keine bestätigten Buchungen"
                className="inline-flex cursor-not-allowed items-center justify-center rounded-md border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-400"
              >
                Teilnehmerliste herunterladen (CSV)
              </span>
            )}
          </div>
          {bookingsQuery.data?.results.length === 0 ? (
            <p className="text-sm text-slate-600">Keine Buchungen vorhanden.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="text-left text-xs uppercase text-slate-600">
                  <tr>
                    <th className="py-2">Buchungsnr.</th>
                    <th className="py-2">Name</th>
                    <th className="py-2">Email</th>
                    <th className="py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {bookingsQuery.data?.results.map((b) => (
                    <tr key={b.id} className="border-t border-slate-100">
                      <td className="py-2 font-mono text-xs">
                        {b.booking_number}
                      </td>
                      <td className="py-2">
                        {b.first_name} {b.last_name}
                      </td>
                      <td className="py-2">{b.email}</td>
                      <td className="py-2">
                        {b.status === "confirmed" ? "bestätigt" : "storniert"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div>
        <Button variant="outline" onClick={() => router.push("/termine")}>
          ← Zurück zur Übersicht
        </Button>
      </div>
    </div>
  );
}
