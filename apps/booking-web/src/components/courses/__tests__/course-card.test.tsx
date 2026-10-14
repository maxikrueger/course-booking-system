import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";

import { CourseCard } from "@/components/courses/course-card";
import messages from "@/messages/de.json";
import type { CourseListItem } from "@/lib/types";

const baseCourse: CourseListItem = {
  id: 1,
  slug: "wab-kurs-deutsch",
  category: { slug: "auto", name: "Auto" },
  title: "WAB-Kurs Deutsch",
  short_description: "Obligatorischer Kurs für Neulenker",
  base_price_chf: "350.00",
  duration_hours: "7.00",
  image_url: null,
  next_session_date: "2026-06-15T08:00:00+02:00",
};

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider
      locale="de"
      messages={messages}
      timeZone="Europe/Zurich"
    >
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("CourseCard", () => {
  it("zeigt Titel, Kategorie, Preis und Detail-Link", () => {
    renderWithIntl(<CourseCard course={baseCourse} />);
    expect(screen.getByText("WAB-Kurs Deutsch")).toBeInTheDocument();
    expect(screen.getByText("Auto")).toBeInTheDocument();
    expect(screen.getByText(/CHF/)).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /Details/ });
    expect(link).toHaveAttribute("href", "/kurse/wab-kurs-deutsch");
  });

  it("zeigt Hinweis, wenn kein nächster Termin existiert", () => {
    renderWithIntl(
      <CourseCard course={{ ...baseCourse, next_session_date: null }} />,
    );
    expect(screen.getByText(messages.courses.no_next_date)).toBeInTheDocument();
  });
});
