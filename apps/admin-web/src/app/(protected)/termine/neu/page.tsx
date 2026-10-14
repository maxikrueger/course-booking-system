"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { SessionForm } from "@/components/sessions/session-form";
import {
  FormCardSkeleton,
  PageHeaderSkeleton,
} from "@/components/ui/skeletons";
import { ApiError } from "@/lib/api";
import {
  createAdminSession,
  fetchAdminCourses,
  fetchAdminLocations,
} from "@/lib/admin-api";
import type { AdminSessionPayload } from "@/lib/types";

export default function NewSessionPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const coursesQuery = useQuery({
    queryKey: ["admin", "courses", "all"],
    queryFn: () => fetchAdminCourses({ page_size: 200 }),
  });
  const locationsQuery = useQuery({
    queryKey: ["admin", "locations"],
    queryFn: fetchAdminLocations,
  });

  const mutation = useMutation({
    mutationFn: (payload: AdminSessionPayload) => createAdminSession(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "sessions"] });
      router.push("/termine");
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setError(JSON.stringify(err.body));
      } else {
        setError("Speichern fehlgeschlagen.");
      }
    },
  });

  if (!coursesQuery.data || !locationsQuery.data) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeaderSkeleton />
        <FormCardSkeleton rows={4} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Neuer Termin</h1>
        <p className="text-sm text-slate-600">
          Lege einen neuen Kurstermin an.
        </p>
      </div>
      <SessionForm
        initial={null}
        courses={coursesQuery.data.results}
        locations={locationsQuery.data}
        defaultPriceFromCourse
        onSubmit={(payload) => {
          setError(null);
          mutation.mutate(payload);
        }}
        submitting={mutation.isPending}
        error={error}
      />
    </div>
  );
}
