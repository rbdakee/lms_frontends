"use client";

/**
 * Стартовый блок пустого нового урока: предметы, классы и язык чипами, чтобы
 * учитель видел, что у «Жоспара» есть, и мог не печатать. Выбор уходит одним из двух путей:
 * в шторку целей с готовыми фильтрами или репликой-сводкой в чат.
 */

import { useLayoutEffect, useRef, useState } from "react";
import type { LessonLang, LessonSubject } from "@lms/api";
import { Button } from "@lms/ui";
import { useLang } from "@lms/ui/lang";
import { SubjectIcon } from "./SubjectIcon";

const LANGS: LessonLang[] = ["ru", "kz"];
/* Иностранные языки: цели одни и те же на любом языке обучения, язык учителя не спрашиваем */
const FOREIGN = new Set(["english", "german", "french"]);
/* Две строки чипов: 2 × 36px + зазор 6px, плюс 6px внутреннего отступа
   .chip-scroll — иначе рамка и обводка фокуса нижнего ряда срезаются клипом */
const TWO_ROWS = 84;

export interface StartChoice {
  subject_code: string;
  grade: number;
  /** null — язык не важен (иностранный язык) */
  lang: LessonLang | null;
}

export function StartPicker({
  subjects,
  disabled,
  onGoals,
  onChat,
}: {
  subjects: LessonSubject[];
  disabled: boolean;
  onGoals: (c: StartChoice) => void;
  onChat: (summary: string) => void;
}) {
  const { t, lang: uiLang } = useLang();
  const [code, setCode] = useState<string | null>(null);
  const [grade, setGrade] = useState<number | null>(null);
  const [lang, setLang] = useState<LessonLang | null>(null);
  const [all, setAll] = useState(false);
  const [overflow, setOverflow] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  /* Влезает ли список в две строки — от этого зависит, нужен ли «Посмотреть все» */
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => {
      if (!all) setOverflow(el.scrollHeight > TWO_ROWS + 1);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [all, subjects, uiLang]);

  if (subjects.length === 0) return null;

  const title = (s: LessonSubject) => (uiLang === "kz" ? s.title_kz : s.title_ru);
  const current = subjects.find((s) => s.code === code) ?? null;
  const foreign = current !== null && FOREIGN.has(current.code);
  const maxGrade = Math.max(...subjects.map((s) => s.grade_to));
  const grades = Array.from({ length: maxGrade }, (_, i) => i + 1);
  const gradeOk = (g: number) => !current || (g >= current.grade_from && g <= current.grade_to);
  const langOk = (l: LessonLang) => !current || current.langs.includes(l);

  const pickSubject = (s: LessonSubject) => {
    if (code === s.code) {
      setCode(null);
      return;
    }
    setCode(s.code);
    if (grade !== null && (grade < s.grade_from || grade > s.grade_to)) setGrade(null);
    if (lang !== null && !s.langs.includes(lang)) setLang(null);
    if (s.langs.length === 1) setLang(s.langs[0]);
  };

  const ready = current !== null && grade !== null && (foreign || lang !== null);
  /* Для иностранного языка в сводку язык не идёт, а шторке нужна какая-то редакция */
  const effLang: LessonLang | null = foreign
    ? current!.langs.includes("ru")
      ? "ru"
      : (current!.langs[0] ?? null)
    : lang;
  const langName = (l: LessonLang) => (l === "ru" ? t.laStartLangRu : t.laStartLangKz);
  const summary = ready
    ? [title(current!), t.laGrade(grade!), ...(foreign ? [] : [langName(lang!)])].join(", ")
    : "";

  return (
    <div className="stack g12" style={{ padding: "4px 0" }}>
      <span className="small muted pretty">{t.laStartHint}</span>

      <div className="stack g6">
        <span className="label">{t.laChatSheetSubject}</span>
        <div
          ref={box}
          className="row g6 wrap chip-scroll"
          style={all ? { maxHeight: 160, overflowY: "auto" } : { maxHeight: TWO_ROWS, overflow: "clip" }}
        >
          {subjects.map((s) => (
            <button
              key={s.code}
              type="button"
              className="chip"
              data-active={code === s.code}
              aria-pressed={code === s.code}
              disabled={disabled}
              onClick={() => pickSubject(s)}
            >
              <SubjectIcon url={s.icon_url} />
              {title(s)}
            </button>
          ))}
        </div>
        {(overflow || all) && (
          <div>
            <button type="button" className="chip" onClick={() => setAll((v) => !v)} aria-expanded={all}>
              {all ? t.laStartLess : t.laStartAll(subjects.length)}
            </button>
          </div>
        )}
      </div>

      <div className="stack g6">
        <span className="label">{t.laChatSheetGrade}</span>
        <div className="row g6 wrap">
          {grades.map((g) => (
            <button
              key={g}
              type="button"
              className="chip"
              data-active={grade === g}
              aria-pressed={grade === g}
              disabled={disabled || !gradeOk(g)}
              style={gradeOk(g) ? undefined : { opacity: 0.45, cursor: "default" }}
              onClick={() => setGrade(grade === g ? null : g)}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      <div className="stack g6">
        <span className="label">{t.laStartLangLabel}</span>
        {foreign ? (
          <span className="small muted">{t.laStartLangAny}</span>
        ) : (
          <div className="row g6 wrap">
            {LANGS.map((l) => (
              <button
                key={l}
                type="button"
                className="chip"
                data-active={lang === l}
                aria-pressed={lang === l}
                disabled={disabled || !langOk(l)}
                style={langOk(l) ? undefined : { opacity: 0.45, cursor: "default" }}
                onClick={() => setLang(lang === l ? null : l)}
              >
                {l === "ru" ? t.laLangRu : t.laLangKz}
              </button>
            ))}
          </div>
        )}
      </div>

      {ready && (
        <div className="row g8 wrap">
          <Button
            disabled={disabled}
            onClick={() => onGoals({ subject_code: current!.code, grade: grade!, lang: effLang })}
          >
            {t.laStartGoals}
          </Button>
          <Button variant="secondary" disabled={disabled} onClick={() => onChat(summary)}>
            {t.laStartChat}
          </Button>
        </div>
      )}
    </div>
  );
}
