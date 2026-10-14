import { describe, expect, it } from "vitest";

import {
  formatDateLong,
  formatDateShort,
  formatPriceCHF,
  formatTimeRange,
} from "@/lib/format";

describe("formatPriceCHF", () => {
  it("formatiert eine Decimal-String-Eingabe", () => {
    expect(formatPriceCHF("350.00")).toMatch(/CHF/);
    expect(formatPriceCHF("350.00")).toMatch(/350/);
  });
  it("gibt ungeparseten Wert zurück bei NaN", () => {
    expect(formatPriceCHF("nicht-eine-zahl")).toBe("nicht-eine-zahl");
  });
});

describe("formatDate*", () => {
  it("formatiert ISO-Zeitstempel deutsch", () => {
    const iso = "2026-06-15T08:00:00+02:00";
    expect(formatDateLong(iso)).toMatch(/2026/);
    expect(formatDateShort(iso)).toMatch(/15\.06\.2026/);
  });
});

describe("formatTimeRange", () => {
  it("rendert Start- und Endzeit", () => {
    const range = formatTimeRange(
      "2026-06-15T08:00:00+02:00",
      "2026-06-15T17:00:00+02:00",
    );
    expect(range).toMatch(/08:00/);
    expect(range).toMatch(/17:00/);
  });
});
