"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableRowsSkeleton } from "@/components/ui/skeletons";
import { fetchAdminCategories, fetchAdminCourses } from "@/lib/admin-api";
import { formatPrice } from "@/lib/format";

export default function KurseListPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<number | undefined>(undefined);
  const [page, setPage] = useState(1);

  const categoriesQuery = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: fetchAdminCategories,
  });

  const coursesQuery = useQuery({
    queryKey: ["admin", "courses", search, category, page],
    queryFn: () => fetchAdminCourses({ search, category, page, page_size: 20 }),
    placeholderData: (prev) => prev,
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Kurse</h1>
          <p className="text-sm text-slate-600">
            Verwaltung aller Kursdefinitionen.
          </p>
        </div>
        <Link href="/kurse/neu">
          <Button>+ Neuer Kurs</Button>
        </Link>
      </div>

      <div className="flex flex-col gap-3 rounded-md border border-slate-200 bg-white p-4 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label
            htmlFor="search"
            className="mb-1 block text-xs font-medium text-slate-700"
          >
            Suche (Slug oder Titel)
          </label>
          <Input
            id="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Suchbegriff"
          />
        </div>
        <div className="w-full sm:w-56">
          <label
            htmlFor="category"
            className="mb-1 block text-xs font-medium text-slate-700"
          >
            Kategorie
          </label>
          <select
            id="category"
            value={category ?? ""}
            onChange={(e) => {
              setCategory(e.target.value ? Number(e.target.value) : undefined);
              setPage(1);
            }}
            className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1 focus-visible:outline-none"
          >
            <option value="">Alle</option>
            {categoriesQuery.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-600">
            <tr>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Titel (DE)</th>
              <th className="px-4 py-3">Preis</th>
              <th className="px-4 py-3">Dauer</th>
              <th className="px-4 py-3">Aktiv</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {coursesQuery.isLoading && <TableRowsSkeleton columns={6} />}
            {coursesQuery.data?.results.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-6 text-center text-slate-500"
                >
                  Keine Kurse gefunden.
                </td>
              </tr>
            )}
            {coursesQuery.data?.results.map((course) => {
              const titleDe = course.translations.de?.title ?? course.slug;
              return (
                <tr
                  key={course.id}
                  className="border-t border-slate-100 hover:bg-slate-50"
                >
                  <td className="px-4 py-3 font-mono text-xs">{course.slug}</td>
                  <td className="px-4 py-3 font-medium">{titleDe}</td>
                  <td className="px-4 py-3">
                    {formatPrice(course.base_price_chf)} CHF
                  </td>
                  <td className="px-4 py-3">{course.duration_hours} h</td>
                  <td className="px-4 py-3">
                    {course.is_active ? (
                      <span className="text-green-700">aktiv</span>
                    ) : (
                      <span className="text-slate-400">inaktiv</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/kurse/${course.id}`}
                      className="text-sm text-slate-700 hover:underline"
                    >
                      Bearbeiten
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {coursesQuery.data && coursesQuery.data.count > 20 && (
        <div className="flex items-center justify-between text-sm">
          <span>
            Seite {page} – {coursesQuery.data.count} Einträge
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!coursesQuery.data.previous}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Zurück
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!coursesQuery.data.next}
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
