import { Suspense } from "react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { NoticeToast } from "@/components/booking/toast";
import { CourseCard } from "@/components/courses/course-card";
import { getCategories, getCourses } from "@/lib/api";
import { cn } from "@/lib/utils";

export const revalidate = 60;

type Props = {
  searchParams: Promise<{ category?: string }>;
};

export default async function CoursesPage({ searchParams }: Props) {
  const t = await getTranslations();
  const params = await searchParams;
  const categorySlug = params.category;

  const [categories, courses] = await Promise.all([
    getCategories({ next: { revalidate: 60, tags: ["categories"] } }).catch(
      () => [],
    ),
    getCourses(categorySlug ? { category: categorySlug } : undefined, {
      next: { revalidate: 60, tags: ["courses"] },
    }).catch(() => ({ count: 0, next: null, previous: null, results: [] })),
  ]);

  return (
    <div className="space-y-8">
      <Suspense fallback={null}>
        <NoticeToast />
      </Suspense>
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          {t("courses.heading")}
        </h1>
        <p className="text-slate-600">{t("courses.lead")}</p>
      </header>

      <nav className="flex flex-wrap gap-2 text-sm" aria-label={t("courses.heading")}>
        <Link
          href="/kurse"
          aria-current={!categorySlug ? "page" : undefined}
          className={cn(
            "rounded-full border px-3 py-1",
            !categorySlug
              ? "border-slate-900 bg-slate-900 text-white"
              : "border-slate-200 text-slate-700 hover:border-slate-400",
          )}
        >
          {t("courses.filter_all")}
        </Link>
        {categories.map((cat) => {
          const active = cat.slug === categorySlug;
          return (
            <Link
              key={cat.slug}
              href={`/kurse?category=${cat.slug}`}
              aria-current={active ? "page" : undefined}
              className={cn(
                "rounded-full border px-3 py-1",
                active
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 text-slate-700 hover:border-slate-400",
              )}
            >
              {cat.name}
            </Link>
          );
        })}
      </nav>

      {courses.results.length === 0 ? (
        <p className="text-slate-600">{t("courses.no_results")}</p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {courses.results.map((course) => (
            <CourseCard key={course.slug} course={course} />
          ))}
        </div>
      )}
    </div>
  );
}
