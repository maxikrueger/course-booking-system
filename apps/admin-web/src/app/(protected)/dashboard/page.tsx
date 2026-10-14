import { cookies } from "next/headers";

import { DashboardView } from "./view";
import { apiFetch, ApiError } from "@/lib/api";
import type { DashboardStats } from "@/lib/types";

export const dynamic = "force-dynamic";

async function fetchStats(): Promise<DashboardStats | null> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
  try {
    return await apiFetch<DashboardStats>("/admin/stats/", {
      cookieHeader,
      noRefresh: true,
      cache: "no-store",
    });
  } catch (err) {
    if (
      err instanceof ApiError &&
      (err.status === 404 || err.status === 401 || err.status === 403)
    ) {
      // Endpoint nicht verfügbar oder Auth abgelaufen → Layout redirected ohnehin.
      return null;
    }
    throw err;
  }
}

export default async function DashboardPage() {
  const stats = await fetchStats();
  return <DashboardView stats={stats} />;
}
