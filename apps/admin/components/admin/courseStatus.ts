/**
 * Общее у списка курсов и редактора курса — раздел 5.16 брифа.
 *
 * Подписи статуса набора знает и StatusBadge, поэтому цвет подбирается сам.
 * Метку языков и относительную дату сервер не отдаёт: `lang`, `versions`
 * и `updated_at` приходят по отдельности, «RU · ҚАЗ» и «2 дня назад»
 * собираются здесь.
 */

import { dayMonth, dayYear, plural, type UiLang } from "@lms/ui/i18n";
import type { AdminCourseVersion, CourseStatus } from "@lms/api";

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

const LANG_LABEL: Record<string, string> = { ru: "RU", kz: "ҚАЗ" };
/* Порядок метки фиксированный, а не порядок ответа: русская версия первой */
const LANG_ORDER = ["ru", "kz"];

/**
 * «RU · ҚАЗ» — язык самого курса плюс языки соседних версий той же группы.
 * Себя сервер в `versions` не включает, поэтому склеиваем оба поля.
 */
export function courseLangs(course: {
  lang: string;
  versions: AdminCourseVersion[];
}): string {
  const uniq = [...new Set([course.lang, ...course.versions.map((v) => v.lang)])];
  uniq.sort((a, b) => {
    const ia = LANG_ORDER.indexOf(a);
    const ib = LANG_ORDER.indexOf(b);
    /* незнакомый язык не теряем, а уводим в конец */
    return (ia < 0 ? LANG_ORDER.length : ia) - (ib < 0 ? LANG_ORDER.length : ib);
  });
  return uniq.map((l) => LANG_LABEL[l] ?? l.toUpperCase()).join(" · ");
}

/** Календарный день в Алматы: «сегодня» — казахстанский день, а не UTC. */
function almatyDate(iso: string): { year: number; epochDay: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Almaty",
    day: "numeric",
    month: "numeric",
    year: "numeric",
  }).formatToParts(new Date(iso));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  const year = get("year");
  return { year, epochDay: Date.UTC(year, get("month") - 1, get("day")) / 86400000 };
}

/**
 * Столбец «Изменён». Свежую правку читают отношением к сегодня, старую —
 * обычной датой: «3 дня назад» про июль ничего не говорит.
 */
export function changedAgo(iso: string, lang: UiLang = "ru"): string {
  const now = almatyDate(new Date().toISOString());
  const then = almatyDate(iso);
  const days = now.epochDay - then.epochDay;
  if (days <= 0) return "сегодня";
  if (days === 1) return "вчера";
  if (days < 7) return `${days} ${plural(days, "день", "дня", "дней")} назад`;
  return then.year === now.year ? dayMonth(iso, lang) : dayYear(iso, lang);
}
