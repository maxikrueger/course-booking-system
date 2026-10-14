/**
 * Admin-API-Client.
 *
 * - Token-Cookies (httpOnly) übernehmen die Authentifizierung; der Browser
 *   sendet sie automatisch via `credentials: "include"`.
 * - Bei 401 versucht der Client einmalig den Refresh-Endpoint und wiederholt
 *   den ursprünglichen Request. Bricht der Refresh ebenfalls mit 401 ab,
 *   wird `onUnauthorized` aufgerufen (z. B. Redirect auf /login).
 *
 * Server- und Client-Pfade nutzen denselben Aufbau wie booking-web (relative
 * URL via Next-Rewrite, absolute URL beim SSR).
 */

const PUBLIC_API_PATH = process.env.NEXT_PUBLIC_API_URL ?? "/api/v1";
const BACKEND_INTERNAL_URL =
  process.env.BACKEND_INTERNAL_URL ?? "http://localhost:8000";

function buildUrl(path: string): string {
  if (typeof window === "undefined") {
    if (PUBLIC_API_PATH.startsWith("/")) {
      return `${BACKEND_INTERNAL_URL}${PUBLIC_API_PATH}${path}`;
    }
    return `${PUBLIC_API_PATH}${path}`;
  }
  return `${PUBLIC_API_PATH}${path}`;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler;
}

let inflightRefresh: Promise<boolean> | null = null;

async function refreshToken(): Promise<boolean> {
  if (inflightRefresh) return inflightRefresh;
  inflightRefresh = (async () => {
    try {
      const url = buildUrl("/admin/auth/refresh/");
      const response = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      return response.ok;
    } catch {
      return false;
    } finally {
      // Reset auf nächsten Tick, damit parallele Calls denselben Refresh teilen.
      setTimeout(() => {
        inflightRefresh = null;
      }, 0);
    }
  })();
  return inflightRefresh;
}

type FetchOptions = {
  language?: string;
  signal?: AbortSignal;
  cache?: RequestCache;
  next?: { revalidate?: number | false; tags?: string[] };
  method?: "GET" | "POST" | "PATCH" | "DELETE" | "PUT";
  body?: unknown;
  /** Wenn true, wird auf 401 NICHT automatisch refreshed (z. B. /me beim Login-Check). */
  noRefresh?: boolean;
  /** Override für Server-Side-Cookies (Server Components). */
  cookieHeader?: string;
  /** Wenn true, JSON parsen; bei false rohe Response zurückgeben. */
  raw?: boolean;
};

const DEFAULT_LANGUAGE = process.env.NEXT_PUBLIC_DEFAULT_LOCALE ?? "de";

async function performFetch(
  path: string,
  options: FetchOptions,
): Promise<Response> {
  const url = buildUrl(path);
  const language = options.language ?? DEFAULT_LANGUAGE;

  const headers: Record<string, string> = {
    Accept: "application/json",
    "Accept-Language": language,
  };
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (options.cookieHeader) {
    headers["Cookie"] = options.cookieHeader;
  }

  return fetch(url, {
    method: options.method ?? "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
    cache: options.cache,
    next: options.next,
    credentials: "include",
  });
}

export async function apiFetch<T>(
  path: string,
  options: FetchOptions = {},
): Promise<T> {
  let response = await performFetch(path, options);

  if (
    response.status === 401 &&
    !options.noRefresh &&
    typeof window !== "undefined"
  ) {
    const ok = await refreshToken();
    if (ok) {
      response = await performFetch(path, options);
    } else if (onUnauthorized) {
      onUnauthorized();
    }
  }

  if (!response.ok) {
    let body: unknown = undefined;
    try {
      body = await response.json();
    } catch {
      // ignore parse errors
    }
    throw new ApiError(
      `API ${response.status} ${response.statusText} for ${path}`,
      response.status,
      body,
    );
  }

  if (options.raw) {
    return response as unknown as T;
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}
