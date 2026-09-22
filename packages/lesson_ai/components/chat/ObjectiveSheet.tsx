"use client";

/**
 * «Показать другие» и «Выбрать самому» — поиск по программе без модели.
 *
 * Код цели наизусть не помнит никто (бриф, раздел 1), поэтому ищем по словам
 * формулировки; без слов — все цели класса в порядке приказа, для этого
 * серверу нужны класс и язык редакции.
 *
 * Язык здесь — фильтр списка, а не язык обучения заказа: заказ он не меняет.
 * Подставляется только из заказа или из показанной карточки, но не из языка
 * интерфейса — русский интерфейс у учителя казахского класса обычное дело.
 */

import { useEffect, useState } from "react";
import { isApiError, type LessonChatObjective, type LessonLang } from "@lms/api";
import { Button, Empty, Note, Sheet, Skeleton } from "@lms/ui";
import { IconSearch } from "@lms/ui/icons";
import { useLang } from "@lms/ui/lang";
import { findObjectives } from "../../api";
import { useLessonAiAccess } from "../../access";
import { ObjectiveText } from "./ObjectiveCards";
import { fieldMessage } from "./util";

/* «Жоспар» начинается с математики 1–4 классов (бриф, раздел 2) */
const GRADES = [1, 2, 3, 4];
const LANGS: LessonLang[] = ["ru", "kz"];
/* Поиск на каждую букву ни к чему — ждём, пока учитель допечатает */
const DEBOUNCE_MS = 300;

export function ObjectiveSheet({
  open,
  grade: initialGrade,
  lang: initialLang,
  chosenId,
  onClose,
  onPick,
}: {
  open: boolean;
  grade: number | null;
  lang: LessonLang | null;
  chosenId: number | null;
  onClose: () => void;
  /** Вернул текст — выбор не прошёл, шторка остаётся открытой с ним. */
  onPick: (o: LessonChatObjective) => Promise<string | null>;
}) {
  const { t } = useLang();
  const { handle } = useLessonAiAccess();
  const [q, setQ] = useState("");
  const [grade, setGrade] = useState<number | null>(initialGrade);
  const [lang, setLang] = useState<LessonLang | null>(initialLang);
  const [items, setItems] = useState<LessonChatObjective[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickError, setPickError] = useState<string | null>(null);
  const [picking, setPicking] = useState<number | null>(null);
  const [attempt, setAttempt] = useState(0);

  /* Каждое открытие — с того, что известно о заказе сейчас */
  useEffect(() => {
    if (!open) return;
    setQ("");
    setGrade(initialGrade);
    setLang(initialLang);
    setPickError(null);
  }, [open, initialGrade, initialLang]);

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
      findObjectives({ q: words || undefined, grade, lang }).then(
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
  }, [open, canList, words, grade, lang, attempt, handle, t]);

  const pick = async (o: LessonChatObjective) => {
    setPicking(o.id);
    setPickError(null);
    const err = await onPick(o);
    setPicking(null);
    if (err) setPickError(err);
  };

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

        <div className="stack g6">
          <span className="label">{t.laChatSheetGrade}</span>
          <div className="row g6 wrap">
            {GRADES.map((g) => (
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
              <div key={o.id} className="card card-pad stack g8">
                <ObjectiveText o={o} />
                <div>
                  <Button
                    size="sm"
                    variant={o.id === chosenId ? "secondary" : "primary"}
                    loading={picking === o.id}
                    disabled={picking !== null || o.id === chosenId}
                    onClick={() => void pick(o)}
                  >
                    {o.id === chosenId ? t.laChatPicked : t.laObjectiveYes}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Sheet>
  );
}
