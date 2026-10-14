"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useTranslations } from "next-intl";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { WizardProgress } from "@/components/booking/progress";
import { useBookingStore } from "@/lib/booking/store";
import { formatDateLong, formatPriceCHF, formatTimeRange } from "@/lib/format";
import type { SessionItem } from "@/lib/types";

type Props = {
  session: SessionItem;
};

export function TerminStepClient({ session }: Props) {
  const t = useTranslations();
  const router = useRouter();
  const setSession = useBookingStore((s) => s.setSession);

  useEffect(() => {
    setSession(session.id);
  }, [session.id, setSession]);

  const handleNext = () => {
    router.push("/buchung/daten");
  };

  const isBookable = session.is_bookable && session.available_spots > 0;

  return (
    <section className="space-y-6">
      <WizardProgress current="termin" />

      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          {t("termin.heading")}
        </h1>
        <p className="text-slate-600">{t("termin.lead")}</p>
      </header>

      <Card>
        <CardContent className="space-y-3 p-6">
          <p className="text-lg font-semibold text-slate-900">
            {formatDateLong(session.start_datetime)}
          </p>
          <p className="text-slate-600">
            {formatTimeRange(session.start_datetime, session.end_datetime)}
            {" · "}
            {session.location.name}, {session.location.city}
          </p>
          <p className="text-sm text-slate-700">
            {t("wizard.price")}{" "}
            <span className="font-semibold">
              {formatPriceCHF(session.price_chf)}
            </span>
          </p>
          <p
            className="text-sm text-slate-700"
            data-testid="termin-available-spots"
          >
            {t("termin.available_spots", { count: session.available_spots })}
          </p>
          {!isBookable && (
            <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {t("wizard.session_unavailable_toast")}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        <Link
          href="/kurse"
          className={cn(buttonVariants({ variant: "ghost" }))}
        >
          {t("termin.select_other")}
        </Link>
        <Button
          type="button"
          onClick={handleNext}
          disabled={!isBookable}
          data-testid="termin-next"
        >
          {t("wizard.next")}
        </Button>
      </div>
    </section>
  );
}
