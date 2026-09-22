"use client";

import { useParams } from "next/navigation";
import { ChatScreen } from "@lms/lesson_ai/screens";

export default function Page() {
  const { id } = useParams<{ id: string }>();
  return <ChatScreen chatId={id} />;
}
