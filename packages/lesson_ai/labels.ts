/**
 * Подписи и порядок — то, что общее у всех экранов «Жоспара».
 *
 * Подписи — на языке интерфейса (словарь), а всё, что уходит в документ, —
 * на языке обучения комплекта. Их не путаем: учитель с русским интерфейсом
 * ведёт казахский класс (`TEACHER_AI_BRIEF`, раздел 1).
 */

import type { LessonLang, LessonMaterialKind } from "@lms/api";
import type { dict } from "@lms/ui/i18n";

type T = (typeof dict)["ru"];

/** Порядок видов — как в брифе (раздел 4) и в списке галочек. */
export const KIND_ORDER: LessonMaterialKind[] = [
  "lesson_plan",
  "presentation",
  "tasks",
  "homework",
  "assessment",
  "game",
  "answer_key",
];

/** Из чего сервер собирает ключи с ответами — без хотя бы одного `422`. */
export const ANSWER_KEY_SOURCES: LessonMaterialKind[] = ["tasks", "homework", "assessment"];

export function kindTitle(t: T, kind: string): string {
  return (t.laKinds as Record<string, string>)[kind] ?? kind;
}

/** Подпись блока: сначала `вид.блок` — у одного имени бывает разный смысл. */
export function blockTitle(t: T, materialKind: string, block: string): string {
  const blocks = t.laBlocks as Record<string, string>;
  return blocks[`${materialKind}.${block}`] ?? blocks[block] ?? block;
}

export function fieldTitle(t: T, key: string): string {
  return (t.laFields as Record<string, string>)[key] ?? key;
}

/** Значение перечисления в блоке (`noise: "quiet"`) по-человечески; чужое — как есть. */
export function enumValue(t: T, value: string): string {
  return (t.laEnumValues as Record<string, string>)[value] ?? value;
}

/** `lang` для разметки содержимого: читалке экрана и переносам нужен код языка. */
export function contentLang(lang: LessonLang): string {
  return lang === "kz" ? "kk" : "ru";
}

/** «через 14 часов» из `retry_after_sec`: секундный таймер на сутки бессмыслен. */
export function hoursFrom(sec: number): number {
  return Math.ceil(sec / 3600);
}

/*
 * Имя файла — на языке документа, а не интерфейса, по той же таблице,
 * что у сервера (`backend/CONTRACT.md`, L5, «файл — все семь видов»).
 * Нужно, пока CORS не выпускает `Content-Disposition` (см. `downloadMaterial`).
 */
const FILE_TITLES: Record<LessonMaterialKind, Record<LessonLang, string>> = {
  lesson_plan: { ru: "ҚМЖ", kz: "ҚМЖ" },
  presentation: { ru: "Презентация", kz: "Презентация" },
  tasks: { ru: "Задания", kz: "Тапсырмалар" },
  homework: { ru: "Домашнее задание", kz: "Үй тапсырмасы" },
  assessment: { ru: "Проверочная работа", kz: "Формативті бағалау" },
  game: { ru: "Игра", kz: "Ойын" },
  answer_key: { ru: "Ключи с ответами", kz: "Жауаптар кілті" },
};

export function materialFileName(kind: LessonMaterialKind, lang: LessonLang, topic: string): string {
  const ext = kind === "presentation" ? "pptx" : "docx";
  /* Знаки, которых не любят файловые системы учителей, — на пробел */
  const safe = topic.replace(/[\\/:*?"<>|\n\r\t]+/g, " ").trim();
  return `${FILE_TITLES[kind][lang]}${safe ? ` — ${safe}` : ""}.${ext}`;
}
