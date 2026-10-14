"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type {
  AdminCategory,
  AdminCourse,
  AdminCoursePayload,
  CourseTranslation,
  Language,
} from "@/lib/types";

const LANGUAGES: { code: Language; label: string; required: boolean }[] = [
  { code: "de", label: "Deutsch", required: true },
  { code: "en", label: "English", required: false },
  { code: "fr", label: "Français", required: false },
];

const EMPTY_TRANSLATION: CourseTranslation = {
  title: "",
  short_description: "",
  long_description: "",
};

type FormState = {
  slug: string;
  category: number | "";
  base_price_chf: string;
  duration_hours: string;
  is_active: boolean;
  order: number;
  translations: Record<Language, CourseTranslation>;
};

function emptyForm(): FormState {
  return {
    slug: "",
    category: "",
    base_price_chf: "0.00",
    duration_hours: "1.00",
    is_active: true,
    order: 0,
    translations: {
      de: { ...EMPTY_TRANSLATION },
      en: { ...EMPTY_TRANSLATION },
      fr: { ...EMPTY_TRANSLATION },
    },
  };
}

function fromCourse(course: AdminCourse): FormState {
  return {
    slug: course.slug,
    category: course.category,
    base_price_chf: course.base_price_chf,
    duration_hours: course.duration_hours,
    is_active: course.is_active,
    order: course.order,
    translations: {
      de: course.translations.de ?? { ...EMPTY_TRANSLATION },
      en: course.translations.en ?? { ...EMPTY_TRANSLATION },
      fr: course.translations.fr ?? { ...EMPTY_TRANSLATION },
    },
  };
}

export function CourseForm({
  initial,
  categories,
  onSubmit,
  submitting,
  error,
}: {
  initial: AdminCourse | null;
  categories: AdminCategory[];
  onSubmit: (payload: AdminCoursePayload) => void;
  submitting: boolean;
  error: string | null;
}) {
  const [state, setState] = useState<FormState>(() =>
    initial ? fromCourse(initial) : emptyForm(),
  );
  const [activeLang, setActiveLang] = useState<Language>("de");

  function setTranslation(
    lang: Language,
    field: keyof CourseTranslation,
    value: string,
  ) {
    setState((s) => ({
      ...s,
      translations: {
        ...s.translations,
        [lang]: { ...s.translations[lang], [field]: value },
      },
    }));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (state.category === "") return;

    const filteredTranslations: Partial<Record<Language, CourseTranslation>> =
      {};
    for (const lang of ["de", "en", "fr"] as const) {
      const t = state.translations[lang];
      const hasContent =
        t.title.trim() || t.short_description.trim() || t.long_description;
      if (hasContent) {
        filteredTranslations[lang] = {
          title: t.title.trim(),
          short_description: t.short_description.trim(),
          long_description: t.long_description,
        };
      }
    }

    const payload: AdminCoursePayload = {
      slug: state.slug,
      category: state.category,
      base_price_chf: state.base_price_chf,
      duration_hours: state.duration_hours,
      is_active: state.is_active,
      order: state.order,
      translations: filteredTranslations,
    };
    onSubmit(payload);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <Card>
        <CardContent className="grid grid-cols-1 gap-4 pt-6 md:grid-cols-2">
          <div>
            <Label htmlFor="slug">Slug *</Label>
            <Input
              id="slug"
              required
              value={state.slug}
              onChange={(e) => setState({ ...state, slug: e.target.value })}
              placeholder="z.B. wab-kurs-deutsch"
            />
          </div>
          <div>
            <Label htmlFor="category">Kategorie *</Label>
            <Select
              id="category"
              required
              value={state.category === "" ? "" : String(state.category)}
              onChange={(e) =>
                setState({
                  ...state,
                  category: e.target.value ? Number(e.target.value) : "",
                })
              }
            >
              <option value="">Bitte wählen …</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="base_price_chf">Standardpreis CHF</Label>
            <Input
              id="base_price_chf"
              type="number"
              step="0.05"
              min="0"
              value={state.base_price_chf}
              onChange={(e) =>
                setState({ ...state, base_price_chf: e.target.value })
              }
            />
          </div>
          <div>
            <Label htmlFor="duration_hours">Dauer (Stunden)</Label>
            <Input
              id="duration_hours"
              type="number"
              step="0.25"
              min="0"
              value={state.duration_hours}
              onChange={(e) =>
                setState({ ...state, duration_hours: e.target.value })
              }
            />
          </div>
          <div>
            <Label htmlFor="order">Sortierreihenfolge</Label>
            <Input
              id="order"
              type="number"
              min="0"
              value={state.order}
              onChange={(e) =>
                setState({ ...state, order: Number(e.target.value) })
              }
            />
          </div>
          <div className="flex items-center gap-2 pt-6">
            <Checkbox
              id="is_active"
              checked={state.is_active}
              onChange={(e) =>
                setState({ ...state, is_active: e.target.checked })
              }
            />
            <Label htmlFor="is_active">Kurs aktiv (im Frontend sichtbar)</Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4 pt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Übersetzungen</h2>
            <p className="text-xs text-slate-500">
              DE Pflicht · EN/FR optional
            </p>
          </div>
          <div
            className="flex gap-2 border-b border-slate-200"
            role="tablist"
            aria-label="Sprachen"
          >
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                type="button"
                role="tab"
                aria-selected={activeLang === l.code}
                onClick={() => setActiveLang(l.code)}
                className={
                  activeLang === l.code
                    ? "border-b-2 border-slate-900 px-4 py-2 text-sm font-medium text-slate-900"
                    : "border-b-2 border-transparent px-4 py-2 text-sm text-slate-500 hover:text-slate-900"
                }
              >
                {l.label}
                {l.required && <span className="ml-1 text-red-500">*</span>}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500">
            Tipp: Lasse alle Felder einer Sprache leer, um diese Übersetzung zu
            entfernen.
          </p>
          <TranslationFields
            language={activeLang}
            value={state.translations[activeLang]}
            onChange={(field, value) =>
              setTranslation(activeLang, field, value)
            }
            required={activeLang === "de"}
          />
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Speichern …" : "Speichern"}
        </Button>
      </div>
    </form>
  );
}

function TranslationFields({
  language,
  value,
  onChange,
  required,
}: {
  language: Language;
  value: CourseTranslation;
  onChange: (field: keyof CourseTranslation, value: string) => void;
  required: boolean;
}) {
  const id = (suffix: string) => `${language}-${suffix}`;
  return (
    <div className="flex flex-col gap-3">
      <div>
        <Label htmlFor={id("title")}>Titel{required ? " *" : ""}</Label>
        <Input
          id={id("title")}
          required={required}
          value={value.title}
          onChange={(e) => onChange("title", e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor={id("short")}>
          Kurzbeschreibung{required ? " *" : ""}
        </Label>
        <Input
          id={id("short")}
          required={required}
          value={value.short_description}
          onChange={(e) => onChange("short_description", e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor={id("long")}>Lange Beschreibung</Label>
        <Textarea
          id={id("long")}
          rows={6}
          value={value.long_description}
          onChange={(e) => onChange("long_description", e.target.value)}
        />
      </div>
    </div>
  );
}
