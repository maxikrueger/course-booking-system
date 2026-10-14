"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api";
import { cancelAdminBooking, fetchAdminBooking } from "@/lib/admin-api";
import { formatDate, formatDateTime } from "@/lib/format";
import type { AdminBooking } from "@/lib/types";

export default function BookingDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const bookingQuery = useQuery({
    queryKey: ["admin", "booking", id],
    queryFn: () => fetchAdminBooking(id),
    enabled: Number.isFinite(id),
  });

  const cancel = useMutation({
    mutationFn: () => cancelAdminBooking(id),
    // Optimistic Update.
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["admin", "booking", id] });
      const previous = queryClient.getQueryData<AdminBooking>([
        "admin",
        "booking",
        id,
      ]);
      if (previous) {
        queryClient.setQueryData<AdminBooking>(["admin", "booking", id], {
          ...previous,
          status: "cancelled",
        });
      }
      return { previous };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(["admin", "booking", id], ctx.previous);
      }
      if (err instanceof ApiError) {
        setError("Stornierung fehlgeschlagen.");
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "bookings"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "booking", id] });
    },
  });

  if (!bookingQuery.data) {
    return (
      <div className="flex flex-col gap-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Card>
          <CardContent className="grid grid-cols-1 gap-4 pt-6 md:grid-cols-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-4 w-full max-w-xs" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }
  const b = bookingQuery.data;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{b.booking_number}</h1>
          <p className="text-sm text-slate-600">
            {b.first_name} {b.last_name} · {b.course_title}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={
              b.status === "confirmed"
                ? "rounded-md bg-green-100 px-3 py-1 text-sm text-green-800"
                : "rounded-md bg-red-100 px-3 py-1 text-sm text-red-800"
            }
          >
            {b.status === "confirmed" ? "bestätigt" : "storniert"}
          </span>
          {b.status === "confirmed" && (
            <Button
              variant="destructive"
              onClick={() => {
                if (confirm("Buchung wirklich stornieren?")) {
                  setError(null);
                  cancel.mutate();
                }
              }}
              disabled={cancel.isPending}
            >
              Stornieren
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <Card>
        <CardContent className="grid grid-cols-1 gap-4 pt-6 md:grid-cols-2">
          <Field label="Anrede" value={b.salutation} />
          <Field label="Sprache" value={b.language} />
          <Field label="Email" value={b.email} />
          <Field label="Telefon" value={b.phone} />
          <Field
            label="Adresse"
            value={`${b.street}, ${b.postal_code} ${b.city}, ${b.country}`}
          />
          <Field label="Geburtsdatum" value={formatDate(b.date_of_birth)} />
          <Field
            label="Führerausweis"
            value={b.license_date ? formatDate(b.license_date) : "—"}
          />
          <Field label="Voucher" value={b.voucher_code || "—"} />
          <Field
            label="Termin"
            value={`${formatDateTime(b.start_datetime)} · ${b.location_name}`}
          />
          <Field label="Erstellt" value={formatDateTime(b.created_at)} />
          <div className="md:col-span-2">
            <Field label="Notizen vom Kunden" value={b.notes || "—"} />
          </div>
        </CardContent>
      </Card>

      <div>
        <Button variant="outline" onClick={() => router.push("/buchungen")}>
          ← Zurück zur Liste
        </Button>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-sm">{value}</p>
    </div>
  );
}
