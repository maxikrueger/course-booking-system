import { cookies } from "next/headers";

import { apiFetch, ApiError } from "./api";
import type { AdminUser } from "./types";

/**
 * Server-seitiger Auth-Check für das geschützte Layout.
 *
 * Liest die httpOnly-Cookies aus dem aktuellen Request und stellt sie an das
 * Backend weiter. Gibt den User zurück oder null, wenn die Tokens fehlen oder
 * abgelaufen sind. Das Layout entscheidet dann über Redirect zu /login.
 */
export async function getAdminUser(): Promise<AdminUser | null> {
  const cookieStore = await cookies();
  const cookieList = cookieStore.getAll();
  if (cookieList.length === 0) {
    return null;
  }
  const cookieHeader = cookieList.map((c) => `${c.name}=${c.value}`).join("; ");

  try {
    const data = await apiFetch<{ user: AdminUser }>("/admin/auth/me/", {
      cookieHeader,
      noRefresh: true,
      cache: "no-store",
    });
    return data.user;
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
      return null;
    }
    throw err;
  }
}
