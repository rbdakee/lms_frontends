"use client";

/**
 * Онбординг не закончен — кабинет закрыт до его завершения.
 *
 * Смотрим `onboarding_done`, а не сам ИИН: сервер уже свёл в это поле и ФИО,
 * и ИИН, и то, что у админа ИИН не спрашивают. Повторять эту логику на фронте
 * значит однажды разойтись с ней. Проверка есть и на сервере — заслон только
 * ведёт человека, а не защищает данные.
 *
 * Бьёт заслон только по кабинету (решение владельца): лендинг, каталог,
 * проверка сертификата, вход и сам онбординг остаются открытыми — незаполненный
 * профиль не повод прятать витрину от того, кто ещё выбирает курс.
 */

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useMe } from "@lms/api";
import { useRoutes } from "../host";

/** Маршруты у обеих площадок одинаковые — список открытого живёт одной строкой. */
const OPEN_PATHS = ["/", "/courses", "/verify", "/login", "/onboarding"];

/** Каталог открыт ровно своим адресом: `/courses/12` — уже кабинет. */
function isOpen(pathname: string): boolean {
  return OPEN_PATHS.includes(pathname) || pathname.startsWith("/verify/");
}

export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const { me, status } = useMe();
  const router = useRouter();
  const pathname = usePathname();
  const routes = useRoutes();

  const gated = status === "authed" && !!me && !me.onboarding_done && !isOpen(pathname);

  useEffect(() => {
    if (gated) router.replace(routes.onboarding(pathname));
  }, [gated, pathname, router]);

  /* Пока идёт увод, детей не рисуем: иначе кабинет мелькнёт перед редиректом */
  if (gated) return null;
  return <>{children}</>;
}
