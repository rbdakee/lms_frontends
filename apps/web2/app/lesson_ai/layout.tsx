"use client";

/**
 * Площадка как хозяин экранов «Жоспара»: адреса и кадр отсюда, экраны —
 * из `@lms/lesson_ai`, общего у обеих площадок. Ворота доступа стоят здесь,
 * над всеми маршрутами продукта: забытый в будущем экран закрыт сам.
 */

import type { ReactNode } from "react";
import { LessonAiGate } from "@lms/lesson_ai/screens";
import { LessonAiHostProvider, type LessonAiHost } from "@lms/lesson_ai/host";
import { TeacherShell } from "@/components/layout/Shell";

const host: LessonAiHost = {
  routes: {
    home: "/lesson_ai",
    newFrom: (kitId) => `/lesson_ai/from/${kitId}`,
    chat: (chatId) => `/lesson_ai/chats/${chatId}`,
    kit: (kitId) => `/lesson_ai/kits/${kitId}`,
    lessons: "/lesson_ai/lessons",
    login: (next) => `/login?next=${encodeURIComponent(next)}`,
  },
  chrome: { Shell: TeacherShell },
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <LessonAiHostProvider host={host}>
      <LessonAiGate>{children}</LessonAiGate>
    </LessonAiHostProvider>
  );
}
