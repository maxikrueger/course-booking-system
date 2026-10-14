"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";

import { WizardProgress } from "@/components/booking/progress";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { personSchema, type PersonFormInput } from "@/lib/booking/schema";
import { useBookingStore } from "@/lib/booking/store";
import { cn } from "@/lib/utils";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="text-xs text-red-600" role="alert">
      {message}
    </p>
  );
}

export function DatenStepClient() {
  const t = useTranslations();
  const router = useRouter();
  const sessionId = useBookingStore((s) => s.sessionId);
  const person = useBookingStore((s) => s.person);
  const updatePerson = useBookingStore((s) => s.updatePerson);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const form = useForm<PersonFormInput>({
    resolver: zodResolver(personSchema),
    defaultValues: person,
    mode: "onBlur",
  });

  // Re-set values once hydration loads aus dem persisted Store
  useEffect(() => {
    if (hydrated) {
      form.reset(person);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  // Auto-Save: jede Eingabe wird in den persisted Store gespiegelt,
  // damit ein Reload mitten im Formular keine Daten verliert.
  useEffect(() => {
    if (!hydrated) return;
    const sub = form.watch((values) => {
      updatePerson(values as Partial<PersonFormInput>);
    });
    return () => sub.unsubscribe();
  }, [form, hydrated, updatePerson]);

  if (hydrated && !sessionId) {
    return (
      <section className="space-y-6">
        <WizardProgress current="daten" />
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

  const onSubmit = (values: PersonFormInput) => {
    updatePerson(values);
    router.push("/buchung/bestaetigung");
  };

  const errors = form.formState.errors;
  const tx = (key: string) => t(`daten.${key}`);

  return (
    <section className="space-y-6">
      <WizardProgress current="daten" />

      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          {tx("heading")}
        </h1>
        <p className="text-slate-600">{tx("lead")}</p>
      </header>

      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-8"
        noValidate
      >
        <fieldset className="space-y-4">
          <legend className="text-base font-semibold text-slate-900">
            {tx("section_person")}
          </legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="salutation">{tx("salutation")} *</Label>
              <Select id="salutation" {...form.register("salutation")}>
                <option value="">{tx("salutation_placeholder")}</option>
                <option value="mr">{tx("salutation_mr")}</option>
                <option value="mrs">{tx("salutation_mrs")}</option>
                <option value="div">{tx("salutation_div")}</option>
              </Select>
              <FieldError message={errors.salutation?.message} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="first_name">{tx("first_name")} *</Label>
              <Input
                id="first_name"
                autoComplete="given-name"
                {...form.register("first_name")}
              />
              <FieldError message={errors.first_name?.message} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="last_name">{tx("last_name")} *</Label>
              <Input
                id="last_name"
                autoComplete="family-name"
                {...form.register("last_name")}
              />
              <FieldError message={errors.last_name?.message} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">{tx("email")} *</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                {...form.register("email")}
              />
              <FieldError message={errors.email?.message} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">{tx("phone")} *</Label>
              <Input
                id="phone"
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                {...form.register("phone")}
              />
              <FieldError message={errors.phone?.message} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="date_of_birth">{tx("date_of_birth")} *</Label>
              <Input
                id="date_of_birth"
                type="date"
                autoComplete="bday"
                {...form.register("date_of_birth")}
              />
              <FieldError message={errors.date_of_birth?.message} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="license_date">{tx("license_date")}</Label>
              <Input
                id="license_date"
                type="date"
                {...form.register("license_date")}
              />
              <p className="text-xs text-slate-500">
                {tx("license_date_hint")}
              </p>
              <FieldError message={errors.license_date?.message} />
            </div>
          </div>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="text-base font-semibold text-slate-900">
            {tx("section_address")}
          </legend>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5 sm:col-span-3">
              <Label htmlFor="street">{tx("street")} *</Label>
              <Input
                id="street"
                autoComplete="street-address"
                {...form.register("street")}
              />
              <FieldError message={errors.street?.message} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="postal_code">{tx("postal_code")} *</Label>
              <Input
                id="postal_code"
                autoComplete="postal-code"
                {...form.register("postal_code")}
              />
              <FieldError message={errors.postal_code?.message} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="city">{tx("city")} *</Label>
              <Input
                id="city"
                autoComplete="address-level2"
                {...form.register("city")}
              />
              <FieldError message={errors.city?.message} />
            </div>
            <div className="space-y-1.5 sm:col-span-3">
              <Label htmlFor="country">{tx("country")}</Label>
              <Input id="country" maxLength={2} {...form.register("country")} />
              <FieldError message={errors.country?.message} />
            </div>
          </div>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="text-base font-semibold text-slate-900">
            {tx("section_meta")}
          </legend>
          <div className="grid gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="voucher_code">{tx("voucher_code")}</Label>
              <Input id="voucher_code" {...form.register("voucher_code")} />
              <FieldError message={errors.voucher_code?.message} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notes">{tx("notes")}</Label>
              <Textarea id="notes" rows={3} {...form.register("notes")} />
              <FieldError message={errors.notes?.message} />
            </div>
          </div>
        </fieldset>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          <Button type="button" variant="ghost" onClick={() => router.back()}>
            {t("wizard.back")}
          </Button>
          <Button
            type="submit"
            data-testid="daten-submit"
            disabled={form.formState.isSubmitting}
          >
            {t("wizard.next")}
          </Button>
        </div>
      </form>
    </section>
  );
}
