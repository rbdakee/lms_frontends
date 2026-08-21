"use client";

/**
 * Кто и где показывает экраны курса.
 *
 * Экраны общие у двух приложений: у учителя это его кабинет, у админа —
 * предпросмотр курса, который он редактирует. Разного между ними ровно три
 * вещи, и все три приходят отсюда:
 *
 * - **адреса**: в кабинете `/courses/12`, в предпросмотре `/preview/12`;
 * - **кадр**: шапка, подвал и нижняя таб-панель у приложений свои;
 * - **выходы наружу** — каталог, сертификаты, профиль: в предпросмотре таких
 *   экранов нет, вместо адреса стоит `null`, и кнопка не рисуется.
 *
 * Приложение задаёт это один раз в своём layout, а экраны про приложение
 * не знают и знать не должны.
 */

import { createContext, useContext, type ReactNode } from "react";

/** Id приходят и строкой из адреса, и числом из ответа сервера. */
type Id = string | number;

export interface CourseRoutes {
  course: (courseId: Id) => string;
  complete: (courseId: Id) => string;
  lesson: (courseId: Id, lessonId: Id) => string;
  quiz: (courseId: Id, quizId: Id) => string;
  quizResult: (courseId: Id, quizId: Id) => string;
  task: (courseId: Id, taskId: Id) => string;
  /** Каталог курсов. `null` — кнопки «В каталог» на экране не будет */
  catalog: string | null;
  /** Список сертификатов учителя */
  certificates: string | null;
  /** Один сертификат */
  certificate: ((certificateId: Id) => string) | null;
  /** Профиль учителя */
  profile: string | null;
  /** Куда отправлять гостя; `next` — полный путь возврата */
  login: (next: string) => string;
  /**
   * Домен публичной проверки сертификата — он печатается на документе и в QR.
   * `null` — тот же сайт, на котором открыт экран.
   */
  verifyOrigin: string | null;
}

export interface CourseChrome {
  /**
   * Кадр обычного экрана курса. `guest` — человек не вошёл: у учителя тогда
   * витринная шапка вместо кабинетной.
   */
  Shell: (p: { children: ReactNode; guest?: boolean; hasStickyCta?: boolean }) => ReactNode;
  /** Кадр экрана внутри курса: шапка с кнопкой «Назад». */
  BackHeader: (p: {
    href: string;
    title: string;
    subtitle?: string;
    right?: ReactNode;
  }) => ReactNode;
  /** Нижняя таб-панель кабинета. В предпросмотре её нет — там она рисует пусто. */
  TabBar: () => ReactNode;
}

export interface CourseHost {
  routes: CourseRoutes;
  chrome: CourseChrome;
}

const Ctx = createContext<CourseHost | null>(null);

export function CourseHostProvider({
  host,
  children,
}: {
  host: CourseHost;
  children: ReactNode;
}) {
  return <Ctx.Provider value={host}>{children}</Ctx.Provider>;
}

function useHost(): CourseHost {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("Экраны курса требуют <CourseHostProvider>");
  return ctx;
}

export function useRoutes(): CourseRoutes {
  return useHost().routes;
}

export function useChrome(): CourseChrome {
  return useHost().chrome;
}
