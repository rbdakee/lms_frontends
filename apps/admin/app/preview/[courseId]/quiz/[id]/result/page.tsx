"use client";

import { useParams } from "next/navigation";
import { QuizResultScreen } from "@lms/course/screens";

export default function Page() {
  const { courseId, id } = useParams<{ courseId: string; id: string }>();
  return <QuizResultScreen courseId={courseId} quizId={id} />;
}
