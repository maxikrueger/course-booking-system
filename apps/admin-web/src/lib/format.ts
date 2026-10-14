export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("de-CH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("de-CH", { dateStyle: "medium" });
}

export function formatPrice(chf: string | number): string {
  const n = typeof chf === "string" ? Number.parseFloat(chf) : chf;
  return n.toLocaleString("de-CH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function toLocalInputValue(iso: string): string {
  // Konvertiere ISO-Datetime zu yyyy-MM-ddTHH:mm für <input type="datetime-local">.
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

export function fromLocalInputValue(value: string): string {
  // datetime-local liefert lokales Datum ohne TZ; ISO-konform zurückgeben.
  if (!value) return "";
  return new Date(value).toISOString();
}
