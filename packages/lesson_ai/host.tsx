"use client";

/**
 * Кто и где показывает экраны «Жоспара».
 *
 * Продукт один на обе учебные площадки (`TEACHER_AI_BRIEF`, раздел 8), поэтому
 * экраны живут в пакете, а площадке остаётся своё — ровно как у `@lms/course/host`
 * и `@lms/site/host`:
 *
 * - **адреса**: маршруты `/lesson_ai/…` у площадки свои, экран их не собирает;
 * - **кадр**: шапка и таб-панель площадки.
 *
 * Бренда площадки здесь нет нарочно: документы «Жоспара» подписывает сервер,
 * а имя самого продукта одно на обе площадки и лежит в `name.ts`.
 *
 * Хозяин задаётся в `app/lesson_ai/layout.tsx` площадки, а не в корневом
 * layout: экранам курса и витрине «Жоспар» не нужен.
 */

import { createContext, useContext, type ReactNode } from "react";

/** Id приходят и строкой из адреса, и числом из ответа сервера. */
type Id = string | number;

export interface LessonAiRoutes {
  /** Вход в продукт: новый разговор об уроке */
  home: string;
  /** Новый разговор с заказом, собранным по прошлому комплекту — «копия как основа» */
  newFrom: (kitId: Id) => string;
  /** Разговор, в котором собирается заказ */
  chat: (chatId: Id) => string;
  /** Комплект: ожидание, материалы, правка по блокам */
  kit: (kitId: Id) => string;
  /** Свои уроки */
  lessons: string;
  /** Куда отправлять гостя; `next` — полный путь возврата */
  login: (next: string) => string;
}

export interface LessonAiChrome {
  /** Кадр кабинета площадки: шапка и таб-панель */
  Shell: (p: { children: ReactNode; title?: string; hideTabBar?: boolean }) => ReactNode;
}

export interface LessonAiHost {
  routes: LessonAiRoutes;
  chrome: LessonAiChrome;
}

const Ctx = createContext<LessonAiHost | null>(null);

export function LessonAiHostProvider({
  host,
  children,
}: {
  host: LessonAiHost;
  children: ReactNode;
}) {
  return <Ctx.Provider value={host}>{children}</Ctx.Provider>;
}

function useHost(): LessonAiHost {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("Экраны «Жоспара» требуют <LessonAiHostProvider>");
  return ctx;
}

export function useRoutes(): LessonAiRoutes {
  return useHost().routes;
}

export function useChrome(): LessonAiChrome {
  return useHost().chrome;
}
