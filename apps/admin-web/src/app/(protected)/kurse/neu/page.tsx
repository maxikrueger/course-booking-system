"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { CourseForm } from "@/components/courses/course-form";
import { ApiError } from "@/lib/api";
import { createAdminCourse, fetchAdminCategories } from "@/lib/admin-api";
import type { AdminCoursePayload } from "@/lib/types";

export default function NewCoursePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const categoriesQuery = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: fetchAdminCategories,
  });

  const mutation = useMutation({
    mutationFn: (payload: AdminCoursePayload) => createAdminCourse(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "courses"] });
      router.push("/kurse");
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setError(JSON.stringify(err.body));
      } else {
        setError("Speichern fehlgeschlagen.");
      }
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Neuer Kurs</h1>
        <p className="text-sm text-slate-600">
          Definiere einen neuen Kurs mit Übersetzungen.
        </p>
      </div>
      {categoriesQuery.data && (
        <CourseForm
          initial={null}
          categories={categoriesQuery.data}
          onSubmit={(payload) => {
            setError(null);
            mutation.mutate(payload);
          }}
          submitting={mutation.isPending}
          error={error}
        />
      )}
    </div>
  );
}
