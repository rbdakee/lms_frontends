"use client";

import { useParams } from "next/navigation";
import { LessonScreen } from "@lms/course/screens";

export default function Page() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  return <LessonScreen courseId={courseId} lessonId={lessonId} />;
}
