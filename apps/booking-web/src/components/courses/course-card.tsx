import Link from "next/link";
import { useTranslations } from "next-intl";

import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { formatDateLong, formatPriceCHF } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CourseListItem } from "@/lib/types";

type Props = {
  course: CourseListItem;
};

export function CourseCard({ course }: Props) {
  const t = useTranslations();

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <p className="text-xs uppercase tracking-wide text-slate-500">
          {course.category.name}
        </p>
        <h2 className="text-lg font-semibold leading-tight">{course.title}</h2>
        <CardDescription className="line-clamp-3">
          {course.short_description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-slate-700">
        <p>
          {t("courses.from")}{" "}
          <span className="font-semibold">
            {formatPriceCHF(course.base_price_chf)}
          </span>{" "}
          ·{" "}
          {t("courses.duration", {
            hours: course.duration_hours,
          })}
        </p>
        <p className="text-slate-600">
          {course.next_session_date
            ? t("courses.next_date", {
                date: formatDateLong(course.next_session_date),
              })
            : t("courses.no_next_date")}
        </p>
      </CardContent>
      <CardFooter className="mt-auto">
        <Link
          href={`/kurse/${course.slug}`}
          className={cn(buttonVariants({ variant: "outline" }), "w-full")}
        >
          {t("courses.details")}
        </Link>
      </CardFooter>
    </Card>
  );
}
