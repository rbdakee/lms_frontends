"use client";

import { useParams } from "next/navigation";
import { QuizScreen } from "@lms/course/screens";

export default function Page() {
  const { courseId, id } = useParams<{ courseId: string; id: string }>();
  return <QuizScreen courseId={courseId} quizId={id} />;
}
