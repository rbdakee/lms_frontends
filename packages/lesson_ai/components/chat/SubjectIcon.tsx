"use client";

/* Значок предмета на чипе — контурная иконка в стиле набора `@lms/ui/icons`
   (сетка 24, обводка 1.75, цвет от текста), а не картинка: чип красится вместе
   с подписью в обычном, выбранном и неактивном состоянии и ничего не грузит.
   Рисунки — Tabler Icons (MIT, tabler.io/icons). Языки — буквами алфавита
   (`LETTERS`): код языка шрифтом, а не линиями — системным, чтобы буквы
   кода выглядели одинаково жирными при любом шрифте сайта.
   Предмет без значка (новый в справочнике) — чип просто без иконки. */

import type { ReactNode } from "react";

const SHAPES: Record<string, ReactNode> = {
  math: (
    <>
      <path d="M3 12h18" />
      <path d="M12 3v18" />
      <path d="M16.5 4.5l3 3" />
      <path d="M19.5 4.5l-3 3" />
      <path d="M6 4v4" />
      <path d="M4 6h4" />
      <path d="M18 16h.01" />
      <path d="M18 20h.01" />
      <path d="M4 18h4" />
    </>
  ),
  music: (
    <>
      <path d="M3 17a3 3 0 1 0 6 0a3 3 0 0 0 -6 0" />
      <path d="M13 17a3 3 0 1 0 6 0a3 3 0 0 0 -6 0" />
      <path d="M9 17v-13h10v13" />
      <path d="M9 8h10" />
    </>
  ),
  labor: (
    <>
      <path d="M3 21h4l13 -13a1.5 1.5 0 0 0 -4 -4l-13 13v4" />
      <path d="M14.5 5.5l4 4" />
      <path d="M12 8l-5 -5l-4 4l5 5" />
      <path d="M7 8l-1.5 1.5" />
      <path d="M16 12l5 5l-4 4l-5 -5" />
      <path d="M16 17l-1.5 1.5" />
    </>
  ),
  art: (
    <>
      <path d="M12 21a9 9 0 0 1 0 -18c4.97 0 9 3.582 9 8c0 1.06 -.474 2.078 -1.318 2.828c-.844 .75 -1.989 1.172 -3.182 1.172h-2.5a2 2 0 0 0 -1 3.75a1.3 1.3 0 0 1 -1 2.25" />
      <path d="M7.5 10.5a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
      <path d="M11.5 7.5a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
      <path d="M15.5 10.5a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
    </>
  ),
  physical_culture: (
    <>
      <path d="M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" />
      <path d="M12 7l4.76 3.45l-1.76 5.55h-6l-1.76 -5.55z" />
      <path d="M12 7v-4m3 13l2.5 3m-.74 -8.55l3.74 -1.45m-11.44 7.05l-2.56 2.95m.74 -8.55l-3.74 -1.45" />
    </>
  ),
  world_around: (
    <>
      <path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0" />
      <path d="M3.6 9h16.8" />
      <path d="M3.6 15h16.8" />
      <path d="M11.5 3a17 17 0 0 0 0 18" />
      <path d="M12.5 3a17 17 0 0 1 0 18" />
    </>
  ),
  natural_science: (
    <>
      <path d="M5 21h14" />
      <path d="M6 18h2" />
      <path d="M7 18v3" />
      <path d="M9 11l3 3l6 -6l-3 -3z" />
      <path d="M10.5 12.5l-1.5 1.5" />
      <path d="M17 3l3 3" />
      <path d="M12 21a6 6 0 0 0 3.715 -10.712" />
    </>
  ),
  digital_literacy: (
    <>
      <path d="M3 19h18" />
      <path d="M5 7a1 1 0 0 1 1 -1h12a1 1 0 0 1 1 1v8a1 1 0 0 1 -1 1h-12a1 1 0 0 1 -1 -1z" />
    </>
  ),
  literacy_ru: (
    <>
      <path d="M3 16v-6a2 2 0 1 1 4 0v6" />
      <path d="M3 13h4" />
      <path d="M10 8v6a2 2 0 1 0 4 0v-1a2 2 0 1 0 -4 0v1" />
      <path d="M20.732 12a2 2 0 0 0 -3.732 1v1a2 2 0 0 0 3.726 1.01" />
    </>
  ),
  native_language_kz: (
    <>
      <path d="M6 4h11a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-11a1 1 0 0 1 -1 -1v-14a1 1 0 0 1 1 -1m3 0v18" />
      <path d="M13 8h2" />
      <path d="M13 12h2" />
    </>
  ),
  literary_reading: (
    <>
      <path d="M3 19a9 9 0 0 1 9 0a9 9 0 0 1 9 0" />
      <path d="M3 6a9 9 0 0 1 9 0a9 9 0 0 1 9 0" />
      <path d="M3 6v13" />
      <path d="M12 6v13" />
      <path d="M21 6v13" />
    </>
  ),
};

/* Языки — двухбуквенный код языка, у каждого свой: так иностранные
   не сливаются в одно «ab», а казахский и русский различимы сразу */
const LETTERS: Record<string, string> = {
  kazakh_lang: "ҚЗ",
  russian_lang: "РУ",
  english: "EN",
  german: "DE",
  french: "FR",
};

const LETTER_FONT = '-apple-system, "Segoe UI", Arial, sans-serif';

/* Варианты одного предмета (Т1/Т2, Я1/Я2, два литературных чтения) делят
   значок: различает их подпись на чипе */
const ALIAS: Record<string, string> = {
  kazakh_lang_l1: "kazakh_lang",
  kazakh_lang_l2: "kazakh_lang",
  russian_lang_l1: "russian_lang",
  russian_lang_l2: "russian_lang",
  literary_reading_ru: "literary_reading",
  literary_reading_kz: "literary_reading",
};

export function SubjectIcon({ code, size = 18 }: { code: string; size?: number }) {
  const key = ALIAS[code] ?? code;
  const letters = LETTERS[key];
  if (letters) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ flex: "none" }}>
        <text x="12" y="17.3" textAnchor="middle" fontSize="15" fontWeight="700" letterSpacing="-0.3" fill="currentColor" fontFamily={LETTER_FONT}>
          {letters}
        </text>
      </svg>
    );
  }
  const shape = SHAPES[key];
  if (!shape) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flex: "none" }}
    >
      {shape}
    </svg>
  );
}
