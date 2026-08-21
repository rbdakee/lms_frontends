"use client";

import { useParams } from "next/navigation";
import { TaskScreen } from "@lms/course/screens";

export default function Page() {
  const { courseId, id } = useParams<{ courseId: string; id: string }>();
  return <TaskScreen courseId={courseId} taskId={id} />;
}
