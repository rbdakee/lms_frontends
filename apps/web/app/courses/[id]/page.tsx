"use client";

/* Экран общий с предпросмотром в админке — он живёт в `@lms/course`.
   Здесь остаётся только маршрут: имя сегмента адреса у приложений своё. */

import { useParams } from "next/navigation";
import { CourseScreen } from "@lms/course/screens";

export default function Page() {
  const { id } = useParams<{ id: string }>();
  return <CourseScreen courseId={id} />;
}
