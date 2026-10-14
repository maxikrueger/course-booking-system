import type {
  BookingCreatePayload,
  BookingResponse,
  Category,
  CourseDetail,
  CourseListItem,
  Paginated,
  SessionItem,
} from "./types";

/**
 * API-Basis:
 *  - Im Browser:    relativer Pfad aus NEXT_PUBLIC_API_URL (Default "/api/v1").
 *                   Der Next-Rewrite (next.config.ts) proxied an das Backend,
 *                   sodass Buchungen vom iPad/Smartphone via LAN-IP des Mac
 *                   funktionieren (same-origin, kein CORS, kein Hardcoding).
 *  - Auf dem Server (Server Components, Route Handlers): absolute URL gegen
 *                   BACKEND_INTERNAL_URL, weil Node-fetch keine relativen
 *                   Pfade kennt. Der Rewrite-Layer existiert dort nicht.
 */
const PUBLIC_API_PATH = process.env.NEXT_PUBLIC_API_URL ?? "/api/v1";
const BACKEND_INTERNAL_URL =
  process.env.BACKEND_INTERNAL_URL ?? "http://localhost:8000";

function buildUrl(path: string): string {
  if (typeof window === "undefined") {
    // Serverseitig: relative Pfade auf Backend absolutieren.
    if (PUBLIC_API_PATH.startsWith("/")) {
      return `${BACKEND_INTERNAL_URL}${PUBLIC_API_PATH}${path}`;
    }
    return `${PUBLIC_API_PATH}${path}`;
  }
  return `${PUBLIC_API_PATH}${path}`;
}

const DEFAULT_LANGUAGE = process.env.NEXT_PUBLIC_DEFAULT_LOCALE ?? "de";

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

type FetchOptions = {
  language?: string;
  signal?: AbortSignal;
  cache?: RequestCache;
  next?: { revalidate?: number | false; tags?: string[] };
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
};

async function apiFetch<T>(
  path: string,
  options: FetchOptions = {},
): Promise<T> {
  const url = buildUrl(path);
  const language = options.language ?? DEFAULT_LANGUAGE;

  const headers: Record<string, string> = {
    Accept: "application/json",
    "Accept-Language": language,
  };
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(url, {
    method: options.method ?? "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
    cache: options.cache,
    next: options.next,
  });

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
  return (await response.json()) as T;
}

export async function getCategories(opts?: FetchOptions): Promise<Category[]> {
  return apiFetch<Category[]>("/categories/", opts);
}

export async function getCourses(
  filter?: { category?: string },
  opts?: FetchOptions,
): Promise<Paginated<CourseListItem>> {
  const search = new URLSearchParams();
  if (filter?.category) search.set("category", filter.category);
  const qs = search.toString();
  return apiFetch<Paginated<CourseListItem>>(
    `/courses/${qs ? `?${qs}` : ""}`,
    opts,
  );
}

export async function getCourse(
  slug: string,
  opts?: FetchOptions,
): Promise<CourseDetail> {
  return apiFetch<CourseDetail>(`/courses/${slug}/`, opts);
}

export async function getCourseSessions(
  slug: string,
  opts?: FetchOptions,
): Promise<SessionItem[]> {
  return apiFetch<SessionItem[]>(`/courses/${slug}/sessions/`, opts);
}

export async function getSession(
  id: number,
  opts?: FetchOptions,
): Promise<SessionItem> {
  return apiFetch<SessionItem>(`/sessions/${id}/`, opts);
}

export async function createBooking(
  payload: BookingCreatePayload,
  opts?: FetchOptions,
): Promise<BookingResponse> {
  return apiFetch<BookingResponse>("/bookings/", {
    ...opts,
    method: "POST",
    body: payload,
  });
}
