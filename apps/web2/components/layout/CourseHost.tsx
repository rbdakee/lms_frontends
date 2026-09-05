"use client";

/**
 * Кабинет второй площадки как хозяин экранов курса — адреса, кадр и бренд отсюда.
 *
 * Экраны курса общие у обеих площадок и у предпросмотра в админке
 * (`packages/course`), поэтому «где я» они не знают. Захардкоженный
 * `/courses/12` внутри пакета — ошибка, а не мелочь.
 */

import type { ReactNode } from "react";
import { CourseHostProvider, type CourseHost as Host } from "@lms/course/host";
import { BackHeader } from "@lms/ui";
import { BRAND } from "@/lib/brand";
import { PublicShell, TabBar, TeacherShell } from "@/components/layout/Shell";

const host: Host = {
  routes: {
    course: (courseId) => `/courses/${courseId}`,
    complete: (courseId) => `/courses/${courseId}/complete`,
    lesson: (courseId, lessonId) => `/learn/${courseId}/${lessonId}`,
    quiz: (courseId, quizId) => `/learn/${courseId}/quiz/${quizId}`,
    quizResult: (courseId, quizId) => `/learn/${courseId}/quiz/${quizId}/result`,
    task: (courseId, taskId) => `/learn/${courseId}/task/${taskId}`,
    catalog: "/courses",
    certificates: "/certificates",
    certificate: (certificateId) => `/certificates/${certificateId}`,
    profile: "/profile",
    login: (next) => `/login?next=${encodeURIComponent(next)}`,
    onboarding: (next) => `/onboarding?next=${encodeURIComponent(next)}`,
    /* Проверка сертификата живёт на этом же сайте: у площадки свой домен,
       и номер второй площадки проверяется только на ней */
    verifyOrigin: null,
  },
  chrome: {
    /* Гостю — витринная шапка, вошедшему — кабинетная: страница курса
       открыта всем, и до входа таб-панели кабинета быть не должно */
    Shell: ({ children, guest, hasStickyCta }) =>
      guest ? (
        <PublicShell hasStickyCta={hasStickyCta}>{children}</PublicShell>
      ) : (
        <TeacherShell hasStickyCta={hasStickyCta}>{children}</TeacherShell>
      ),
    BackHeader,
    TabBar,
  },
  /* Этим именем подписан сертификат — у первой площадки оно своё */
  brand: BRAND,
};

export function CourseHost({ children }: { children: ReactNode }) {
  return <CourseHostProvider host={host}>{children}</CourseHostProvider>;
}
