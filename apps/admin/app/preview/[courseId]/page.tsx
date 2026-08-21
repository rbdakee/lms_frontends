"use client";

/* Экран общий с кабинетом учителя — он живёт в `@lms/course`.
   Здесь остаётся только маршрут. */

import { useParams } from "next/navigation";
import { CourseScreen } from "@lms/course/screens";

export default function Page() {
  const { courseId } = useParams<{ courseId: string }>();
  return <CourseScreen courseId={courseId} />;
}
