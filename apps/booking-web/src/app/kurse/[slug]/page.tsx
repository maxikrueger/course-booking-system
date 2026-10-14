import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { CourseDetail } from "@/components/courses/course-detail";
import { ApiError, getCourse, getCourseSessions } from "@/lib/api";

export const revalidate = 60;

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const course = await getCourse(slug);
    return {
      title: course.title,
      description: course.short_description,
    };
  } catch {
    return { title: slug };
  }
}

export default async function CourseDetailPage({ params }: Props) {
  const { slug } = await params;

  let course;
  try {
    course = await getCourse(slug, {
      next: { revalidate: 60, tags: ["courses", `course:${slug}`] },
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    throw error;
  }

  const sessions = await getCourseSessions(slug, {
    next: { revalidate: 30, tags: [`course-sessions:${slug}`] },
  }).catch(() => []);

  return <CourseDetail course={course} sessions={sessions} />;
}
