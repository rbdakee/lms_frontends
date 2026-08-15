/**
 * Подписи статуса набора для админки — раздел 5.16 брифа.
 * Те же слова знает StatusBadge, поэтому цвет подбирается сам.
 */

import type { CourseStatus } from "@lms/prototype/data";

export const COURSE_STATUS_LABEL: Record<CourseStatus, string> = {
  draft: "Черновик",
  planned: "Запланирован",
  open: "Идёт набор",
  closed: "Набор закрыт",
  hidden: "Скрыт",
};

export const COURSE_STATUS_ORDER: CourseStatus[] = [
  "open",
  "planned",
  "closed",
  "draft",
  "hidden",
];
