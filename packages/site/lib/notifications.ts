/**
 * Уведомления: адрес перехода и оформление строки.
 *
 * Сервер отдаёт `type` и `params` с идентификаторами, а не готовые пути —
 * маршруты знает только фронт. Сборка адреса живёт в одном месте: колокольчик
 * в шапке и экран `/notifications` показывают одни и те же уведомления, и
 * разъехавшийся переход — это два разных ответа на один клик.
 *
 * Текст уведомления сервер собирает на языке читателя, здесь его не трогаем.
 */

import type { ReactElement } from "react";
import { api, type Notification, type NotificationType } from "@lms/api";
import { IconCheckCircle, IconKey, IconMail, IconRefresh, IconSparkle } from "@lms/ui/icons";
import type { SiteRoutes } from "../host";

/** `params` приходят свободным объектом — числа достаём по имени поля. */
function num(params: Notification["params"], key: string): number | null {
  const v = params[key];
  return typeof v === "number" && v > 0 ? v : null;
}

export function notificationHref(routes: SiteRoutes, n: Notification): string {
  const course = num(n.params, "course_id");
  switch (n.type) {
    case "access_granted":
      return course ? routes.course(course) : routes.my;
    case "submission_reviewed": {
      const task = num(n.params, "task_id");
      return course && task ? routes.task(course, task) : routes.my;
    }
    case "answer_posted": {
      const lesson = num(n.params, "lesson_id");
      return course && lesson ? routes.lesson(course, lesson) : routes.my;
    }
    case "certificate_issued":
      return routes.certificates;
    case "retake_allowed": {
      const quiz = num(n.params, "quiz_id");
      return course && quiz ? routes.quiz(course, quiz) : routes.my;
    }
  }
}

export const NOTIF_ICONS: Record<
  NotificationType,
  (p: { size?: number }) => ReactElement
> = {
  access_granted: IconKey,
  submission_reviewed: IconCheckCircle,
  answer_posted: IconMail,
  certificate_issued: IconSparkle,
  retake_allowed: IconRefresh,
};

export const NOTIF_TONES: Record<NotificationType, { bg: string; fg: string }> = {
  access_granted: { bg: "var(--success-bg)", fg: "var(--success)" },
  submission_reviewed: { bg: "var(--success-bg)", fg: "var(--success)" },
  answer_posted: { bg: "var(--primary-bg)", fg: "var(--primary)" },
  certificate_issued: { bg: "var(--warning-bg)", fg: "var(--warning-text)" },
  retake_allowed: { bg: "var(--primary-bg)", fg: "var(--primary)" },
};

/**
 * Отметка «прочитано». Отказ не показываем: человек в этот момент уже уходит
 * по ссылке, и делать с ошибкой служебного запроса ему нечего — при следующей
 * загрузке уведомление просто окажется непрочитанным.
 */
export async function markRead(body: { ids: number[] } | { all: true }) {
  try {
    await api<undefined>("/notifications/read", { method: "POST", json: body });
  } catch {
    /* уведомление останется непрочитанным — не повод для экрана ошибки */
  }
  for (const fn of listeners) fn();
}

/**
 * Счётчик непрочитанных живёт в шапке, а отмечают прочитанным ещё и на экране
 * `/notifications` — это разные компоненты. Чтобы бейдж гас сразу, а не после
 * перехода по страницам, они подписываются на общее событие.
 */
const listeners = new Set<() => void>();

export function onNotificationsChanged(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
