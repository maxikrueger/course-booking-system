"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { CourseForm } from "@/components/courses/course-form";
import { Button } from "@/components/ui/button";
import {
  FormCardSkeleton,
  PageHeaderSkeleton,
} from "@/components/ui/skeletons";
import { ApiError } from "@/lib/api";
import {
  deleteAdminCourse,
  fetchAdminCategories,
  fetchAdminCourse,
  updateAdminCourse,
} from "@/lib/admin-api";
import type { AdminCoursePayload } from "@/lib/types";

export default function EditCoursePage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const courseQuery = useQuery({
    queryKey: ["admin", "course", id],
    queryFn: () => fetchAdminCourse(id),
    enabled: Number.isFinite(id),
  });

  const categoriesQuery = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: fetchAdminCategories,
  });

  const update = useMutation({
    mutationFn: (payload: AdminCoursePayload) => updateAdminCourse(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "courses"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "course", id] });
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

  const remove = useMutation({
    mutationFn: () => deleteAdminCourse(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "courses"] });
      router.push("/kurse");
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 409) {
        setError(
          "Kurs hat Buchungen und kann nicht gelöscht werden. Bitte stattdessen Termine absagen.",
        );
      } else {
        setError("Löschen fehlgeschlagen.");
      }
    },
  });

  if (!courseQuery.data || !categoriesQuery.data) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeaderSkeleton />
        <FormCardSkeleton rows={3} />
        <FormCardSkeleton rows={2} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Kurs bearbeiten</h1>
          <p className="text-sm text-slate-600">
            Slug: <span className="font-mono">{courseQuery.data.slug}</span>
          </p>
        </div>
        <Button
          variant="destructive"
          onClick={() => {
            if (
              confirm(
                "Kurs wirklich löschen? Das ist nur möglich, wenn keine Buchungen existieren.",
              )
            ) {
              setError(null);
              remove.mutate();
            }
          }}
          disabled={remove.isPending}
        >
          Kurs löschen
        </Button>
      </div>

      <CourseForm
        initial={courseQuery.data}
        categories={categoriesQuery.data}
        onSubmit={(payload) => {
          setError(null);
          update.mutate(payload);
        }}
        submitting={update.isPending}
        error={error}
      />
    </div>
  );
}
