"use client";

/* «Копия как основа»: новый разговор с заказом, собранным по прошлому комплекту */

import { useParams } from "next/navigation";
import { ChatScreen } from "@lms/lesson_ai/screens";

export default function Page() {
  const { kitId } = useParams<{ kitId: string }>();
  return <ChatScreen fromKitId={kitId} />;
}
