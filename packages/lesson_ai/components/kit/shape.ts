/**
 * Форма содержимого блока — общая для просмотра и правки.
 *
 * Схем у семи видов семь, и описывать каждую руками на фронте значит держать
 * вторую копию `backend/app/lesson_ai/schemas`, которая отстанет первой же
 * правкой промпта. Поэтому экран идёт по **форме значения**: строка, число,
 * булево, список, объект. Знать приходится только то, чего по значению
 * не угадать, — перечисления и порядок полей.
 */

/** Перечисления схем: по значению их не отличить от строки, а свободный ввод сервер отобьёт. */
export const ENUMS: Record<string, string[]> = {
  noise: ["quiet", "voiced", "loud"],
  cut: ["grid", "none"],
  stage: ["stage_beginning", "stage_middle", "stage_end", "whole_lesson"],
  thinking_level: ["knowledge", "application", "higher_order"],
};

/*
 * Порядок полей внутри объектов. База хранит JSONB и пересортировывает ключи
 * (`CONTRACT.md`, L3), поэтому слайд приехал бы «строки, заметка, заголовок».
 * Список сведён из всех схем: у каждого объекта поля идут в нём так же,
 * как в документе. Незнакомое поле встаёт в конец, а не пропадает.
 */
const FIELD_ORDER = [
  "block",
  "number",
  "code",
  "name",
  "item",
  "title",
  "subsection",
  "plan_step",
  "instruction",
  "instructions",
  "task",
  "text",
  "marker",
  "answer",
  "lines",
  "visual",
  "notes",
  "tasks",
  "answers",
  "criterion",
  "thinking_level",
  "descriptors",
  "points",
  "who",
  "does",
  "stage",
  "minutes",
  "fit",
  "steps",
  "needs_die",
  "coins",
  "cutting",
  "sets",
  "room",
  "noise",
  "props",
  "copies",
  "cut",
  "columns",
  "cells",
  "token_label",
  "tokens_for",
  "diploma_text",
  "support",
  "challenge",
  "vocabulary",
  "phrases",
  "teacher",
  "students",
  "resources",
];

export type Obj = Record<string, unknown>;

export function isObj(v: unknown): v is Obj {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function orderedKeys(o: Obj): string[] {
  const rank = (k: string) => {
    const i = FIELD_ORDER.indexOf(k);
    return i === -1 ? FIELD_ORDER.length : i;
  };
  return Object.keys(o).sort((a, b) => rank(a) - rank(b));
}

/*
 * Пустой список не подскажет, из чего он состоит. Из всех схем пустыми
 * бывают только `resources` и `props` (строки) и `coins` (номиналы-числа).
 */
const EMPTY_LIST_ITEM: Record<string, unknown> = { coins: 0 };

/** Каким будет новый элемент пустого списка под ключом `key`. */
export function itemForEmptyList(key: string | undefined): unknown {
  return key !== undefined && key in EMPTY_LIST_ITEM ? EMPTY_LIST_ITEM[key] : "";
}

/**
 * Пустая копия формы: строки пустые, числа 0, булевы false, вложенные
 * списки — из одного пустого элемента. Перечисление берёт первое значение:
 * пустой строки сервер в нём не примет, а селект без выбора не нарисовать.
 */
export function emptyLike(v: unknown, key?: string): unknown {
  if (key !== undefined && ENUMS[key] && typeof v === "string") return ENUMS[key][0];
  if (typeof v === "string") return "";
  if (typeof v === "number") return 0;
  if (typeof v === "boolean") return false;
  if (Array.isArray(v)) return v.length ? [emptyLike(v[v.length - 1], key)] : [];
  if (isObj(v)) {
    const out: Obj = {};
    for (const k of Object.keys(v)) out[k] = emptyLike(v[k], k);
    return out;
  }
  return v;
}

/** Есть ли в блоке задача с ответом — после её правки сервер пересобирает ключи. */
export function hasAnswers(v: unknown): boolean {
  if (Array.isArray(v)) return v.some(hasAnswers);
  if (isObj(v)) return "answer" in v || Object.values(v).some(hasAnswers);
  return false;
}
