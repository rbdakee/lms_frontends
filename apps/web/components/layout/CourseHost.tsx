"use client";

/**
 * Кабинет учителя как хозяин экранов курса — адреса и кадр отсюда.
 *
 * Те же экраны показывает админка в предпросмотре, поэтому «где я» они
 * не знают: адреса и шапку им отдаёт приложение (`@lms/course/host`).
 */

import type { ReactNode } from "react";
import { CourseHostProvider, type CourseHost as Host } from "@lms/course/host";
import { BackHeader } from "@lms/ui";
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
    /* Проверка сертификата живёт на этом же сайте */
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
};

export function CourseHost({ children }: { children: ReactNode }) {
  return <CourseHostProvider host={host}>{children}</CourseHostProvider>;
}
