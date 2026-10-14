import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { CategoryNav } from "@/components/courses/category-nav";
import { getCategories } from "@/lib/api";

export async function Header() {
  const t = await getTranslations();
  const categories = await getCategories({
    next: { revalidate: 60, tags: ["categories"] },
  }).catch(() => []);

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight text-slate-900"
        >
          {t("site.title")}
        </Link>
        <nav className="flex flex-wrap items-center gap-4 text-sm text-slate-700">
          <Link href="/" className="hover:text-slate-900">
            {t("nav.home")}
          </Link>
          <Link href="/kurse" className="hover:text-slate-900">
            {t("nav.courses")}
          </Link>
          <CategoryNav categories={categories} />
        </nav>
      </div>
    </header>
  );
}
