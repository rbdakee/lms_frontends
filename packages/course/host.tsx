"use client";

/**
 * Кто и где показывает экраны курса.
 *
 * Экраны общие у трёх приложений: у учителя это его кабинет — на каждой
 * из двух площадок, — у админа предпросмотр курса, который он редактирует.
 * Разного между ними ровно четыре вещи, и все четыре приходят отсюда:
 *
 * - **адреса**: в кабинете `/courses/12`, в предпросмотре `/preview/12`;
 * - **кадр**: шапка, подвал и нижняя таб-панель у приложений свои;
 * - **выходы наружу** — каталог, сертификаты, профиль: в предпросмотре таких
 *   экранов нет, вместо адреса стоит `null`, и кнопка не рисуется;
 * - **бренд**: название площадки и логотип. Ими подписан сертификат, а имя
 *   у площадок разное — в общем словаре ему не место.
 *
 * Приложение задаёт это один раз в своём layout, а экраны про приложение
 * не знают и знать не должны.
 */

import { createContext, useContext, type ReactNode } from "react";

/** Id приходят и строкой из адреса, и числом из ответа сервера. */
type Id = string | number;

/** Название площадки на одном языке. */
export interface BrandName {
  /** Одной строкой: подпись логотипа, копирайт в подвале */
  name: string;
  /** То же название в две строки: в одну оно рвёт и шапку, и бумагу
      сертификата, а автоперенос ломает его не там */
  line1: string;
  line2: string;
}

/**
 * Бренд площадки. Печатается на сертификате, а сертификат — документ:
 * имя первой площадки на бумаге второй отзывать неловко. Поэтому бренд
 * приходит от приложения, как адреса и кадр, а не лежит в общем словаре.
 *
 * Язык выбирает не интерфейс, а сам документ: сертификат одноязычный,
 * и подписан он на языке своего курса.
 */
export interface CourseBrand {
  ru: BrandName;
  kz: BrandName;
  /** Адрес файла логотипа — `logo.src` статического импорта */
  logoSrc: string;
}

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
  /**
   * Онбординг: туда ведёт отказ `iin_required` — ИИН правится там.
   *
   * Поле необязательное, а не `null`, как соседние выходы наружу: онбординга
   * в предпросмотре админки нет вовсе, а обязательное поле пришлось бы гасить
   * в `PreviewHost`, который эта сессия править не вправе.
   */
  onboarding?: (next: string) => string;
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
  brand: CourseBrand;
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

export function useBrand(): CourseBrand {
  return useHost().brand;
}
