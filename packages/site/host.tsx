"use client";

/**
 * Кто и где показывает общие экраны площадки.
 *
 * Экраны одни и те же у обеих учебных площадок: вход, онбординг, профиль,
 * уведомления, сертификаты и проверка сертификата. Разного между площадками
 * пять вещей, и все пять приходят от хозяина:
 *
 * - **адреса**: маршруты своего приложения плюс адрес админки — он на чужом
 *   домене, и это не маршрут Next, а полная ссылка;
 * - **кадр**: шапка, подвал и нижняя таб-панель — у каждой площадки свои;
 * - **мелочи шапки**: логотип и переключатель языка. На входе и в онбординге
 *   шапки нет вовсе, а логотип показать надо — значит и он приходит отсюда,
 *   а не импортом из приложения;
 * - **контакты**: почта поддержки печатается на экране входа и на экране
 *   проверки сертификата, и у второй площадки она своя;
 * - **бренд**: имя площадки — им подписан результат проверки сертификата.
 *   Он приходит из хоста курса, см. `useBrand` в конце файла.
 *
 * Приложение задаёт это один раз в своём layout, а экраны про приложение
 * не знают и знать не должны. Захардкоженный `/courses/12` или `help@lms.kz`
 * внутри `packages/site` — ошибка.
 *
 * Устройство повторяет `@lms/course/host` нарочно: два общих пакета,
 * подключаемые по-разному, пришлось бы объяснять каждому, кто их откроет.
 */

import { createContext, useContext, type ReactNode } from "react";

/** Id приходят и строкой из адреса, и числом из ответа сервера. */
type Id = string | number;

export interface SiteRoutes {
  /** Лендинг площадки */
  home: string;
  /** Кабинет — «Моё обучение» */
  my: string;
  /** Каталог курсов */
  catalog: string;
  course: (courseId: Id) => string;
  lesson: (courseId: Id, lessonId: Id) => string;
  quiz: (courseId: Id, quizId: Id) => string;
  task: (courseId: Id, taskId: Id) => string;
  certificates: string;
  certificate: (certificateId: Id) => string;
  notifications: string;
  /**
   * Вход. `next` — полный путь возврата; без него — просто экран входа.
   */
  login: (next?: string) => string;
  /** Онбординг после первого входа, с тем же возвратом */
  onboarding: (next?: string) => string;
  /**
   * Админка живёт на другом домене и деплоится отдельно: ссылка туда — полный
   * адрес, а не маршрут. Видит её только админ, в профиле.
   */
  admin: (path?: string) => string;
}

export interface SiteChrome {
  /** Кадр кабинета: шапка и нижняя таб-панель площадки */
  TeacherShell: (p: { children: ReactNode }) => ReactNode;
  /** Кадр публичной страницы */
  PublicShell: (p: { children: ReactNode }) => ReactNode;
  /** Подвал публичной страницы */
  Footer: () => ReactNode;
  /** Нижняя таб-панель кабинета — на экранах без шапки */
  TabBar: () => ReactNode;
  /** Логотип площадки */
  Logo: () => ReactNode;
  /** Переключатель языка интерфейса */
  LangSwitch: () => ReactNode;
}

export interface SiteContacts {
  /** Почта поддержки: на входе и на экране проверки сертификата */
  mail: string;
}

export interface SiteHost {
  routes: SiteRoutes;
  chrome: SiteChrome;
  contacts: SiteContacts;
}

const Ctx = createContext<SiteHost | null>(null);

export function SiteHostProvider({ host, children }: { host: SiteHost; children: ReactNode }) {
  return <Ctx.Provider value={host}>{children}</Ctx.Provider>;
}

function useHost(): SiteHost {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("Общие экраны площадки требуют <SiteHostProvider>");
  return ctx;
}

export function useRoutes(): SiteRoutes {
  return useHost().routes;
}

export function useChrome(): SiteChrome {
  return useHost().chrome;
}

export function useContacts(): SiteContacts {
  return useHost().contacts;
}

/**
 * Бренд площадки — её название на двух языках и логотип.
 *
 * Контракт у него один на оба общих пакета, и живёт он в хосте курса
 * (`@lms/course/host`): там его первым потребовал сертификат. Здесь он только
 * переэкспортирован, чтобы экраны этого пакета брали своё из своего хоста
 * и чтобы способ узнать имя площадки остался ровно один.
 */
export { useBrand } from "@lms/course/host";
