"use client";

import { useParams } from "next/navigation";
import { KitScreen } from "@lms/lesson_ai/screens";

export default function Page() {
  const { id } = useParams<{ id: string }>();
  return <KitScreen kitId={id} />;
}
