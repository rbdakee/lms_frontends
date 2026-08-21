"use client";

import { useParams } from "next/navigation";
import { CompleteScreen } from "@lms/course/screens";

export default function Page() {
  const { courseId } = useParams<{ courseId: string }>();
  return <CompleteScreen courseId={courseId} />;
}
