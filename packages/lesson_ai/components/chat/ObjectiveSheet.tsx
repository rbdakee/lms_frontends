"use client";

/**
 * «Показать другие» и «Выбрать самому» — поиск по программе без модели.
 *
 * Код цели наизусть не помнит никто (бриф, раздел 1), поэтому ищем по словам
 * формулировки; без слов — все цели класса в порядке приказа, для этого
 * серверу нужны класс и язык редакции.
 *
 * Целей на урок может быть несколько: цели отмечаются круглыми чекбоксами,
 * «Готово (N)» записывает набор в урок. Отмеченные живут в чате, а не здесь, —
 * шторку можно закрыть и открыть, не потеряв отметок.
 *
 * Язык здесь — фильтр списка, а не язык обучения урока: урок он не меняет.
 * Подставляется только из заказа или из показанной карточки, но не из языка
 * интерфейса — русский интерфейс у учителя казахского класса обычное дело.
 */

import { useEffect, useState } from "react";
import {
  isApiError,
  type LessonChatObjective,
  type LessonLang,
  type LessonSubject,
} from "@lms/api";
import { Button, Empty, Note, Sheet, Skeleton } from "@lms/ui";
import { IconSearch } from "@lms/ui/icons";
import { useLang } from "@lms/ui/lang";
import { findObjectives, listSubjects } from "../../api";
import { useLessonAiAccess } from "../../access";
import { DoneBar, ManyNote, ObjectiveChoice } from "./ObjectiveCards";
import { SubjectIcon } from "./SubjectIcon";
import { fieldMessage } from "./util";

/* Начальная школа: 1–4 классы; выбранный предмет сужает их до своего диапазона */
const GRADES = [1, 2, 3, 4];
const LANGS: LessonLang[] = ["ru", "kz"];
/* Поиск на каждую букву ни к чему — ждём, пока учитель допечатает */
const DEBOUNCE_MS = 300;

export function ObjectiveSheet({
  open,
  subjectCode: initialSubject,
  grade: initialGrade,
  lang: initialLang,
  picked,
  committedIds,
  onClose,
  onToggle,
  onDone,
}: {
  open: boolean;
  subjectCode: string | null;
  grade: number | null;
  lang: LessonLang | null;
  picked: LessonChatObjective[];
  committedIds: number[];
  onClose: () => void;
  onToggle: (o: LessonChatObjective) => void;
  /** Вернул текст — набор не записался, шторка остаётся открытой с ним. */
  onDone: () => Promise<string | null>;
}) {
  const { t, lang: uiLang } = useLang();
  const { handle } = useLessonAiAccess();
  const [q, setQ] = useState("");
  const [subject, setSubject] = useState<string | null>(initialSubject);
  /* null — ещё грузим; провал загрузки даёт [] с флагом, чтобы не врать «программы готовятся» */
  const [subjects, setSubjects] = useState<LessonSubject[] | null>(null);
  const [subjectsFailed, setSubjectsFailed] = useState(false);
  const [grade, setGrade] = useState<number | null>(initialGrade);
  const [lang, setLang] = useState<LessonLang | null>(initialLang);
  const [items, setItems] = useState<LessonChatObjective[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickError, setPickError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [attempt, setAttempt] = useState(0);

  /* Каждое открытие — с того, что известно о заказе сейчас */
  useEffect(() => {
    if (!open) return;
    setQ("");
    setSubject(initialSubject);
    setGrade(initialGrade);
    setLang(initialLang);
    setPickError(null);
  }, [open, initialSubject, initialGrade, initialLang]);

  /* Предметы — справочник, а не поиск: берём при открытии, а не на каждый ввод */
  useEffect(() => {
    if (!open) return;
    let alive = true;
    setSubjectsFailed(false);
    listSubjects().then(
      (res) => {
        if (alive) setSubjects(res.items);
      },
      (e) => {
        if (!alive || handle(e)) return;
        setSubjectsFailed(true);
      },
    );
    return () => {
      alive = false;
    };
  }, [open, handle]);

  /* Предмета, которого нет среди опубликованных, в фильтре не оставляем: сервер отказал бы */
  const subjectCode = subjects?.some((s) => s.code === subject) ? subject : null;
  const current = subjects?.find((s) => s.code === subjectCode) ?? null;
  const grades = current
    ? GRADES.filter((g) => g >= current.grade_from && g <= current.grade_to)
    : GRADES;
  const noPrograms = subjects !== null && subjects.length === 0 && !subjectsFailed;

  const pickSubject = (s: LessonSubject) => {
    const next = subjectCode === s.code ? null : s;
    setSubject(next?.code ?? null);
    if (next && grade !== null && (grade < next.grade_from || grade > next.grade_to)) setGrade(null);
  };

  const words = q.trim();
  const canList = words !== "" || (grade !== null && lang !== null);

  useEffect(() => {
    if (!open || !canList) {
      setItems(null);
      setError(null);
      return;
    }
    let alive = true;
    setLoading(true);
    setError(null);
    const timer = setTimeout(() => {
      findObjectives({ q: words || undefined, grade, lang, subject_code: subjectCode }).then(
        (res) => {
          if (!alive) return;
          setItems(res.items);
          setLoading(false);
        },
        (e) => {
          if (!alive) return;
          setLoading(false);
          if (handle(e)) return;
          setError(isApiError(e, "validation_error") ? fieldMessage(e) : t.loadErrorText);
        },
      );
    }, DEBOUNCE_MS);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [open, canList, words, subjectCode, grade, lang, attempt, handle, t]);

  const done = async () => {
    setSaving(true);
    setPickError(null);
    const err = await onDone();
    setSaving(false);
    if (err) setPickError(err);
  };

  if (noPrograms) {
    return (
      <Sheet open={open} onClose={onClose} title={t.laObjectiveChosen} wide>
        <Empty
          icon={<IconSearch size={38} />}
          title={t.laObjectiveNoPrograms}
          text={t.laObjectiveNoProgramsText}
        />
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onClose={onClose} title={t.laObjectiveChosen} wide>
      <div className="stack g16">
        <div className="input-wrap">
          <span className="input-icon">
            <IconSearch size={18} />
          </span>
          <input
            className="input"
            type="search"
            value={q}
            placeholder={t.laObjectiveSearch}
            aria-label={t.laObjectiveSearch}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        {subjects !== null && subjects.length > 0 && (
          <div className="stack g6">
            <span className="label">{t.laChatSheetSubject}</span>
            {/* Предметов до двух десятков: перенос в строки, но не выше пяти строк — дальше прокрутка */}
            <div className="row g6 wrap chip-scroll" style={{ maxHeight: 132, overflowY: "auto" }}>
              {subjects.map((s) => (
                <button
                  key={s.code}
                  type="button"
                  className="chip"
                  data-active={subjectCode === s.code}
                  aria-pressed={subjectCode === s.code}
                  onClick={() => pickSubject(s)}
                >
                  <SubjectIcon url={s.icon_url} />
                  {uiLang === "kz" ? s.title_kz : s.title_ru}
                </button>
              ))}
            </div>
          </div>
        )}

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
                onClick={() => setGrade(grade === g ? null : g)}
              >
                {t.laGrade(g)}
              </button>
            ))}
          </div>
        </div>

        <div className="stack g6">
          <span className="label">{t.laChatSheetLang}</span>
          <div className="row g6 wrap">
            {LANGS.map((l) => (
              <button
                key={l}
                type="button"
                className="chip"
                data-active={lang === l}
                aria-pressed={lang === l}
                onClick={() => setLang(lang === l ? null : l)}
              >
                {l === "ru" ? t.laLangRu : t.laLangKz}
              </button>
            ))}
          </div>
        </div>

        {pickError && <Note kind="warning">{pickError}</Note>}

        {!canList ? (
          <p className="small muted pretty">{t.laChatSheetHint}</p>
        ) : error ? (
          <Empty
            title={t.loadError}
            text={error}
            action={
              <Button variant="secondary" onClick={() => setAttempt((n) => n + 1)}>
                {t.retry}
              </Button>
            }
          />
        ) : loading && items === null ? (
          <div className="stack g8">
            <Skeleton h={72} r={12} />
            <Skeleton h={72} r={12} />
            <Skeleton h={72} r={12} />
          </div>
        ) : items && items.length === 0 ? (
          <Empty icon={<IconSearch size={38} />} title={t.laObjectiveNone} text={t.laObjectiveNoneText} />
        ) : (
          <div className="stack g8" style={{ opacity: loading ? 0.6 : 1 }}>
            {!words && <span className="caption muted-3">{t.laObjectiveAllOfGrade}</span>}
            {(items ?? []).map((o) => (
              <ObjectiveChoice key={o.id} o={o} picked={picked} disabled={saving} onToggle={onToggle} />
            ))}
          </div>
        )}

        {/* Отметки не пропадают при смене фильтров: счётчик и «Готово» всегда на виду */}
        {picked.length > 0 && (
          <div
            className="stack g8"
            style={{ position: "sticky", bottom: 0, padding: "8px 0", background: "var(--sticky-bg)" }}
          >
            <ManyNote count={picked.length} />
            <div className="row g8 wrap">
              <DoneBar
                picked={picked}
                committedIds={committedIds}
                disabled={false}
                loading={saving}
                onDone={() => void done()}
              />
              <span className="small muted">{t.laObjectivesCount(picked.length)}</span>
              <span className="caption muted-3">{t.laObjectivesOrder}</span>
            </div>
          </div>
        )}
      </div>
    </Sheet>
  );
}
