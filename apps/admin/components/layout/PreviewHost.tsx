"use client";

/**
 * Админка как хозяин экранов курса — режим предпросмотра.
 *
 * Те же экраны показывает кабинет учителя, поэтому «где я» они не знают:
 * адреса и кадр приходят отсюда (`@lms/course/host`).
 *
 * Выходов наружу в режиме нет: каталога, сертификатов, профиля и «моих
 * курсов» в админке не существует, и вместо адреса стоит `null` — экран
 * тогда не рисует такую кнопку вовсе.
 */

import type { ReactNode } from "react";
import { CourseHostProvider, type CourseHost as Host } from "@lms/course/host";
import { BackHeader } from "@lms/ui";
import logo from "@lms/ui/logo.png";
import { WEB_URL } from "@/lib/urls";

const host: Host = {
  routes: {
    course: (courseId) => `/preview/${courseId}`,
    complete: (courseId) => `/preview/${courseId}/complete`,
    lesson: (courseId, lessonId) => `/preview/${courseId}/lesson/${lessonId}`,
    quiz: (courseId, quizId) => `/preview/${courseId}/quiz/${quizId}`,
    quizResult: (courseId, quizId) => `/preview/${courseId}/quiz/${quizId}/result`,
    task: (courseId, taskId) => `/preview/${courseId}/task/${taskId}`,
    catalog: null,
    certificates: null,
    certificate: null,
    profile: null,
    login: (next) => `/login?next=${encodeURIComponent(next)}`,
    /* Сертификат проверяют на сайте учителя: админский домен закрыт по IP,
       и печатать его на документе нельзя */
    verifyOrigin: WEB_URL,
  },
  chrome: {
    /* Шапки у экрана нет: сверху висит полоса режима, и второй шапкой
       админ бы только терял место. Признак гостя не смотрим — до
       предпросмотра доходит только вошедший админ */
    Shell: ({ children, hasStickyCta }) => (
      <main
        className={hasStickyCta ? "has-sticky-cta no-tabbar" : undefined}
        style={hasStickyCta ? undefined : { paddingBottom: 0 }}
      >
        {children}
      </main>
    ),
    BackHeader,
    /* Нижней таб-панели кабинета в админке нет */
    TabBar: () => null,
  },
  /* Предпросмотр показывает содержание курса, а не оформление площадки:
     бренда второй платформы в нём нет (PLATFORMS_BRIEF, решение 16).
     Сертификат здесь подписан так же, как был до разделения площадок */
  brand: {
    ru: {
      name: "Академия педагогов и психологов",
      line1: "Академия педагогов",
      line2: "и психологов",
    },
    kz: {
      name: "Педагогтар мен психологтар академиясы",
      line1: "Педагогтар мен психологтар",
      line2: "академиясы",
    },
    logoSrc: logo.src,
  },
};

export function PreviewHost({ children }: { children: ReactNode }) {
  return <CourseHostProvider host={host}>{children}</CourseHostProvider>;
}
