"use client";

/* Экран общий у обеих учебных площадок — он живёт в `@lms/site`.
   Здесь остаётся только маршрут: адреса и кадр приложение отдаёт через хозяина. */

import { LoginScreen } from "@lms/site/screens/LoginScreen";

export default function Page() {
  return <LoginScreen />;
}
