"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { TableRowsSkeleton } from "@/components/ui/skeletons";
import { fetchAdminBookings } from "@/lib/admin-api";
import { formatDateTime } from "@/lib/format";

export default function BuchungenListPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);

  const bookingsQuery = useQuery({
    queryKey: ["admin", "bookings", search, statusFilter, page],
    queryFn: () =>
      fetchAdminBookings({
        search: search || undefined,
        status: statusFilter || undefined,
        page,
        page_size: 25,
      }),
    placeholderData: (prev) => prev,
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Buchungen</h1>
        <p className="text-sm text-slate-600">Alle Teilnehmer-Buchungen.</p>
      </div>

      <div className="flex flex-col gap-3 rounded-md border border-slate-200 bg-white p-4 sm:flex-row">
        <div className="flex-1">
          <Input
            aria-label="Suche nach Name, Email oder Buchungsnummer"
            placeholder="Suche nach Name, Email, Buchungsnummer"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="w-full sm:w-44">
          <Select
            aria-label="Status-Filter"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Alle Status</option>
            <option value="confirmed">bestätigt</option>
            <option value="cancelled">storniert</option>
          </Select>
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-600">
            <tr>
              <th className="px-4 py-3">Buchungsnr.</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Kurs</th>
              <th className="px-4 py-3">Termin</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {bookingsQuery.isLoading && <TableRowsSkeleton columns={6} />}
            {bookingsQuery.data?.results.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-6 text-center text-slate-500"
                >
                  Keine Buchungen.
                </td>
              </tr>
            )}
            {bookingsQuery.data?.results.map((b) => (
              <tr
                key={b.id}
                className="border-t border-slate-100 hover:bg-slate-50"
              >
                <td className="px-4 py-3 font-mono text-xs">
                  {b.booking_number}
                </td>
                <td className="px-4 py-3 font-medium">
                  {b.first_name} {b.last_name}
                </td>
                <td className="px-4 py-3">{b.course_title}</td>
                <td className="px-4 py-3 text-xs">
                  {formatDateTime(b.start_datetime)}
                </td>
                <td className="px-4 py-3">
                  {b.status === "confirmed" ? (
                    <span className="text-green-700">bestätigt</span>
                  ) : (
                    <span className="text-red-700">storniert</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/buchungen/${b.id}`}
                    className="text-sm text-slate-700 hover:underline"
                  >
                    Details
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {bookingsQuery.data && bookingsQuery.data.count > 25 && (
        <div className="flex items-center justify-between text-sm">
          <span>
            Seite {page} – {bookingsQuery.data.count} Einträge
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!bookingsQuery.data.previous}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Zurück
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!bookingsQuery.data.next}
              onClick={() => setPage((p) => p + 1)}
            >
              Weiter
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
