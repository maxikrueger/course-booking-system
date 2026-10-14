"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import { WizardProgress } from "@/components/booking/progress";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ApiError, createBooking, getSession } from "@/lib/api";
import { personSchema } from "@/lib/booking/schema";
import { useBookingStore } from "@/lib/booking/store";
import { formatDateLong, formatPriceCHF, formatTimeRange } from "@/lib/format";
import type { BookingErrorBody } from "@/lib/types";
import { cn } from "@/lib/utils";

export function BestaetigungStepClient() {
  const t = useTranslations();
  const router = useRouter();
  const sessionId = useBookingStore((s) => s.sessionId);
  const person = useBookingStore((s) => s.person);
  const termsAccepted = useBookingStore((s) => s.termsAccepted);
  const setTermsAccepted = useBookingStore((s) => s.setTermsAccepted);
  const reset = useBookingStore((s) => s.reset);

  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const sessionQuery = useQuery({
    enabled: hydrated && sessionId !== null,
    queryKey: ["session", sessionId],
    queryFn: () => getSession(sessionId as number),
    staleTime: 30 * 1000,
  });

  const personParse = personSchema.safeParse(person);

  if (hydrated && (!sessionId || !personParse.success)) {
    return (
      <section className="space-y-6">
        <WizardProgress current="bestaetigung" />
        <p className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {t("wizard.no_session_selected")}
        </p>
        <Link
          href="/kurse"
          className={cn(buttonVariants({ variant: "default" }))}
        >
          {t("wizard.to_courses")}
        </Link>
      </section>
    );
  }

  const submit = async () => {
    if (!sessionId || !personParse.success) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const data = personParse.data;
      const response = await createBooking({
        session_id: sessionId,
        salutation: data.salutation as "mr" | "mrs" | "div",
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        phone: data.phone,
        street: data.street,
        postal_code: data.postal_code,
        city: data.city,
        country: data.country || "CH",
        date_of_birth: data.date_of_birth,
        license_date: data.license_date || null,
        voucher_code: data.voucher_code,
        notes: data.notes,
        language: "de",
        accept_terms: true,
      });
      const bookingNumber = response.booking_number;
      reset();
      router.push(`/buchung/erfolg/${encodeURIComponent(bookingNumber)}`);
    } catch (err) {
      if (err instanceof ApiError) {
        const body = err.body as BookingErrorBody | undefined;
        if (body?.error === "session_full") {
          setSubmitError(t("bestaetigung.submit_error_full"));
          // Kurze Pause, dann zurück zur Termin-Auswahl
          setTimeout(() => {
            router.push(`/kurse?notice=session_full`);
          }, 1500);
          return;
        }
        if (body?.field_errors) {
          setSubmitError(t("bestaetigung.submit_error_validation"));
          return;
        }
      }
      setSubmitError(t("bestaetigung.submit_error_default"));
    } finally {
      setSubmitting(false);
    }
  };

  const session = sessionQuery.data;

  return (
    <section className="space-y-6">
      <WizardProgress current="bestaetigung" />

      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          {t("bestaetigung.heading")}
        </h1>
        <p className="text-slate-600">{t("bestaetigung.lead")}</p>
      </header>

      <div
        role="alert"
        data-testid="binding-banner"
        className="rounded-md border-2 border-red-600 bg-red-50 px-4 py-3 text-sm text-red-900"
      >
        <p className="font-semibold uppercase tracking-wide">
          {t("bestaetigung.binding_banner_title")}
        </p>
        <p>{t("bestaetigung.binding_banner_text")}</p>
      </div>

      <Card>
        <CardContent className="space-y-3 p-6">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-base font-semibold text-slate-900">
              {t("bestaetigung.section_session")}
            </h2>
            <Link
              href={
                sessionId
                  ? `/buchung/termin/${encodeURIComponent(String(sessionId))}`
                  : "/kurse"
              }
              className="text-xs text-slate-600 underline"
            >
              {t("bestaetigung.edit_session")}
            </Link>
          </div>
          {session ? (
            <div className="text-sm text-slate-700">
              <p className="font-medium text-slate-900">
                {formatDateLong(session.start_datetime)}
              </p>
              <p>
                {formatTimeRange(session.start_datetime, session.end_datetime)}{" "}
                · {session.location.name}, {session.location.city}
              </p>
              <p>
                {t("wizard.price")}{" "}
                <span className="font-semibold">
                  {formatPriceCHF(session.price_chf)}
                </span>
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-500">…</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-6">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-base font-semibold text-slate-900">
              {t("bestaetigung.section_person")}
            </h2>
            <Link
              href="/buchung/daten"
              className="text-xs text-slate-600 underline"
            >
              {t("bestaetigung.edit_person")}
            </Link>
          </div>
          <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
            <dt className="text-slate-500">{t("daten.first_name")}</dt>
            <dd className="text-slate-900">{person.first_name}</dd>
            <dt className="text-slate-500">{t("daten.last_name")}</dt>
            <dd className="text-slate-900">{person.last_name}</dd>
            <dt className="text-slate-500">{t("daten.email")}</dt>
            <dd className="text-slate-900">{person.email}</dd>
            <dt className="text-slate-500">{t("daten.phone")}</dt>
            <dd className="text-slate-900">{person.phone}</dd>
            <dt className="text-slate-500">{t("daten.street")}</dt>
            <dd className="text-slate-900">{person.street}</dd>
            <dt className="text-slate-500">{t("daten.city")}</dt>
            <dd className="text-slate-900">
              {person.postal_code} {person.city}
            </dd>
            <dt className="text-slate-500">{t("daten.date_of_birth")}</dt>
            <dd className="text-slate-900">{person.date_of_birth}</dd>
            {person.license_date && (
              <>
                <dt className="text-slate-500">{t("daten.license_date")}</dt>
                <dd className="text-slate-900">{person.license_date}</dd>
              </>
            )}
          </dl>
        </CardContent>
      </Card>

      <div className="flex items-start gap-3">
        <Checkbox
          id="accept_terms"
          checked={termsAccepted}
          onChange={(e) => setTermsAccepted(e.target.checked)}
          data-testid="accept-terms"
        />
        <Label htmlFor="accept_terms" className="text-sm text-slate-700">
          {t("bestaetigung.accept_terms_label")}
        </Label>
      </div>

      {submitError && (
        <p
          role="alert"
          data-testid="submit-error"
          className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-900"
        >
          {submitError}
        </p>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push("/buchung/daten")}
        >
          {t("wizard.back")}
        </Button>
        <Button
          type="button"
          data-testid="bestaetigung-submit"
          onClick={submit}
          disabled={!termsAccepted || submitting}
        >
          {submitting ? t("bestaetigung.submitting") : t("bestaetigung.submit")}
        </Button>
      </div>
    </section>
  );
}
