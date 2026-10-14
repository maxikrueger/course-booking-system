"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { fromLocalInputValue, toLocalInputValue } from "@/lib/format";
import type {
  AdminCourse,
  AdminLocation,
  AdminSession,
  AdminSessionPayload,
} from "@/lib/types";

type FormState = {
  course: number | "";
  location: number | "";
  start_local: string;
  end_local: string;
  max_participants: number;
  price_chf: string;
  status: "open" | "cancelled" | "closed";
  internal_notes: string;
};

function emptyForm(defaultStart: Date): FormState {
  const start = defaultStart;
  const end = new Date(start.getTime() + 7 * 60 * 60 * 1000);
  return {
    course: "",
    location: "",
    start_local: toLocalInputValue(start.toISOString()),
    end_local: toLocalInputValue(end.toISOString()),
    max_participants: 12,
    price_chf: "0.00",
    status: "open",
    internal_notes: "",
  };
}

function fromSession(s: AdminSession): FormState {
  return {
    course: s.course,
    location: s.location,
    start_local: toLocalInputValue(s.start_datetime),
    end_local: toLocalInputValue(s.end_datetime),
    max_participants: s.max_participants,
    price_chf: s.price_chf,
    status: s.status,
    internal_notes: s.internal_notes,
  };
}

export function SessionForm({
  initial,
  courses,
  locations,
  defaultPriceFromCourse,
  onSubmit,
  submitting,
  error,
}: {
  initial: AdminSession | null;
  courses: AdminCourse[];
  locations: AdminLocation[];
  defaultPriceFromCourse?: boolean;
  onSubmit: (payload: AdminSessionPayload) => void;
  submitting: boolean;
  error: string | null;
}) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 7);
  tomorrow.setHours(8, 0, 0, 0);

  const [state, setState] = useState<FormState>(() =>
    initial ? fromSession(initial) : emptyForm(tomorrow),
  );

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (state.course === "" || state.location === "") return;
    const payload: AdminSessionPayload = {
      course: state.course,
      location: state.location,
      start_datetime: fromLocalInputValue(state.start_local),
      end_datetime: fromLocalInputValue(state.end_local),
      max_participants: state.max_participants,
      price_chf: state.price_chf,
      status: state.status,
      internal_notes: state.internal_notes,
    };
    onSubmit(payload);
  }

  function handleCourseChange(courseId: number) {
    setState((s) => {
      const next = { ...s, course: courseId };
      if (defaultPriceFromCourse) {
        const c = courses.find((x) => x.id === courseId);
        if (c) next.price_chf = c.base_price_chf;
      }
      return next;
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <Card>
        <CardContent className="grid grid-cols-1 gap-4 pt-6 md:grid-cols-2">
          <div>
            <Label htmlFor="course">Kurs *</Label>
            <Select
              id="course"
              required
              value={state.course === "" ? "" : String(state.course)}
              onChange={(e) => handleCourseChange(Number(e.target.value))}
            >
              <option value="">Bitte wählen …</option>
              {courses.map((c) => {
                const title = c.translations.de?.title ?? c.slug;
                return (
                  <option key={c.id} value={c.id}>
                    {title}
                  </option>
                );
              })}
            </Select>
          </div>
          <div>
            <Label htmlFor="location">Ort *</Label>
            <Select
              id="location"
              required
              value={state.location === "" ? "" : String(state.location)}
              onChange={(e) =>
                setState({ ...state, location: Number(e.target.value) })
              }
            >
              <option value="">Bitte wählen …</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="start">Start *</Label>
            <Input
              id="start"
              type="datetime-local"
              required
              value={state.start_local}
              onChange={(e) =>
                setState({ ...state, start_local: e.target.value })
              }
            />
          </div>
          <div>
            <Label htmlFor="end">Ende *</Label>
            <Input
              id="end"
              type="datetime-local"
              required
              value={state.end_local}
              onChange={(e) =>
                setState({ ...state, end_local: e.target.value })
              }
            />
          </div>
          <div>
            <Label htmlFor="max">Max. Teilnehmer *</Label>
            <Input
              id="max"
              type="number"
              min="1"
              required
              value={state.max_participants}
              onChange={(e) =>
                setState({
                  ...state,
                  max_participants: Number(e.target.value),
                })
              }
            />
          </div>
          <div>
            <Label htmlFor="price">Preis CHF *</Label>
            <Input
              id="price"
              type="number"
              step="0.05"
              min="0"
              required
              value={state.price_chf}
              onChange={(e) =>
                setState({ ...state, price_chf: e.target.value })
              }
            />
          </div>
          <div>
            <Label htmlFor="status">Status</Label>
            <Select
              id="status"
              value={state.status}
              onChange={(e) =>
                setState({
                  ...state,
                  status: e.target.value as FormState["status"],
                })
              }
            >
              <option value="open">offen</option>
              <option value="closed">geschlossen</option>
              <option value="cancelled">abgesagt</option>
            </Select>
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="notes">Interne Notizen</Label>
            <Textarea
              id="notes"
              rows={3}
              value={state.internal_notes}
              onChange={(e) =>
                setState({ ...state, internal_notes: e.target.value })
              }
            />
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Speichern …" : "Speichern"}
        </Button>
      </div>
    </form>
  );
}
