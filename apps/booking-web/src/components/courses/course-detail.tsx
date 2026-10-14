import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateLong, formatPriceCHF, formatTimeRange } from "@/lib/format";
import type { CourseDetail as CourseDetailT, SessionItem } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = {
  course: CourseDetailT;
  sessions: SessionItem[];
};

export async function CourseDetail({ course, sessions }: Props) {
  const t = await getTranslations();

  return (
    <article className="space-y-10">
      <Link
        href="/kurse"
        className="text-sm text-slate-600 hover:text-slate-900"
      >
        ← {t("course_detail.back")}
      </Link>

      <header className="space-y-3">
        <p className="text-xs uppercase tracking-wide text-slate-500">
          {course.category.name}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          {course.title}
        </h1>
        <p className="max-w-2xl text-base text-slate-600">
          {course.short_description}
        </p>
        <p className="text-sm text-slate-700">
          {t("courses.from")}{" "}
          <span className="font-semibold">
            {formatPriceCHF(course.base_price_chf)}
          </span>{" "}
          · {t("courses.duration", { hours: course.duration_hours })}
        </p>
      </header>

      {course.long_description && (
        <section className="prose prose-slate max-w-none whitespace-pre-line text-slate-700">
          {course.long_description}
        </section>
      )}

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
          {t("course_detail.sessions_heading")}
        </h2>
        {sessions.length === 0 ? (
          <p className="text-slate-600">{t("course_detail.no_sessions")}</p>
        ) : (
          <ul className="grid gap-3">
            {sessions.map((session) => (
              <li key={session.id}>
                <Card>
                  <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <p className="font-medium text-slate-900">
                        {formatDateLong(session.start_datetime)}
                      </p>
                      <p className="text-sm text-slate-600">
                        {formatTimeRange(
                          session.start_datetime,
                          session.end_datetime,
                        )}
                        {" · "}
                        {session.location.name}, {session.location.city}
                      </p>
                      <p className="text-sm text-slate-700">
                        {formatPriceCHF(session.price_chf)} ·{" "}
                        {t("course_detail.available_spots", {
                          count: session.available_spots,
                        })}
                      </p>
                    </div>
                    {session.is_bookable ? (
                      <Link
                        href={`/buchung/termin/${session.id}`}
                        className={cn(buttonVariants({ variant: "default" }))}
                        data-testid={`book-session-${session.id}`}
                      >
                        {t("course_detail.book")}
                      </Link>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        disabled
                        title={t("course_detail.book_disabled")}
                      >
                        {t("course_detail.book_disabled")}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </article>
  );
}
