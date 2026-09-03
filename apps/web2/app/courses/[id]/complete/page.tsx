"use client";

import { useParams } from "next/navigation";
import { CompleteScreen } from "@lms/course/screens";

export default function Page() {
  const { id } = useParams<{ id: string }>();
  return <CompleteScreen courseId={id} />;
}
