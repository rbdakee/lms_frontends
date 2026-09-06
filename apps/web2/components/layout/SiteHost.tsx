"use client";

/**
 * Вторая площадка как хозяин общих экранов.
 *
 * Вход, онбординг, профиль, уведомления, сертификаты и проверка сертификата
 * одинаковы у обеих площадок и живут в `@lms/site`. Своё у площадки — адреса,
 * кадр, логотип с переключателем языка; всё это отдаётся отсюда, ровно как
 * экраны курса получают своё из `CourseHost`.
 */

import type { ReactNode } from "react";
import { SiteHostProvider, type SiteHost as Host } from "@lms/site/host";
import { admin } from "@/lib/urls";
import { Footer, LangSwitch, Logo, PublicShell, TabBar, TeacherShell } from "@/components/layout/Shell";

const host: Host = {
  routes: {
    home: "/",
    my: "/my",
    catalog: "/courses",
    course: (courseId) => `/courses/${courseId}`,
    lesson: (courseId, lessonId) => `/learn/${courseId}/${lessonId}`,
    quiz: (courseId, quizId) => `/learn/${courseId}/quiz/${quizId}`,
    task: (courseId, taskId) => `/learn/${courseId}/task/${taskId}`,
    certificates: "/certificates",
    certificate: (certificateId) => `/certificates/${certificateId}`,
    notifications: "/notifications",
    /* Возврат в адрес входа подставляется как есть, а в адрес онбординга —
       закодированным: так это собрано у первой площадки, и расхождение
       чинится один раз в обоих хостах, а не по-своему у каждой площадки
       (SESSION_P4_QA.md, «Открыто», пункт 1) */
    login: (next) => (next ? `/login?next=${next}` : "/login"),
    onboarding: (next) => (next ? `/onboarding?next=${encodeURIComponent(next)}` : "/onboarding"),
    admin,
  },
  chrome: { TeacherShell, PublicShell, Footer, TabBar, Logo, LangSwitch },
};

export function SiteHost({ children }: { children: ReactNode }) {
  return <SiteHostProvider host={host}>{children}</SiteHostProvider>;
}
