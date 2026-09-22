"use client";

/**
 * «Что подготовить?» — галочки, два уровня, необязательное и «Готовить».
 *
 * Показывается, когда сервер собрал все пятеро (`order.ready`). Оба уровня
 * видны всегда (бриф, раздел 4.3): у них есть середина, но спрятанный вопрос
 * даёт задания «средние по больнице». Необязательное — одним блоком, его
 * можно не трогать.
 *
 * Предвыбор — из заказа; у «копии как основы» — из прошлого комплекта.
 * Сказанное потом в чате («добавь игру») сервер пишет в заказ, и форма
 * его догоняет: при расхождении прав последний, кто говорил.
 */

import { useEffect, useRef, useState } from "react";
import type {
  DifficultyLevel,
  EngagementLevel,
  LessonChatConfirmIn,
  LessonChatOrder,
  LessonMaterialKind,
} from "@lms/api";
import { Button, Note } from "@lms/ui";
import { IconCheck } from "@lms/ui/icons";
import { useLang } from "@lms/ui/lang";
import { DIFFICULTY_LEVELS, ENGAGEMENT_LEVELS } from "../../api";
import { ANSWER_KEY_SOURCES, KIND_ORDER, contentLang, kindTitle } from "../../labels";

const CLASS_SIZE_MIN = 1;
const CLASS_SIZE_MAX = 60;
const NOTES_MAX = 1000;

/** Предвыбор «копии как основы» — живёт в состоянии экрана, не на сервере. */
export interface ConfirmPreset {
  kinds: LessonMaterialKind[];
  engagement_level: EngagementLevel;
  difficulty_level: DifficultyLevel;
  class_size: number | null;
  notes: string;
}

interface FormState {
  kinds: LessonMaterialKind[];
  engagement: EngagementLevel;
  difficulty: DifficultyLevel;
  classSize: string;
  notes: string;
}

function fromSource(s: ConfirmPreset): FormState {
  return {
    kinds: s.kinds,
    engagement: s.engagement_level,
    difficulty: s.difficulty_level,
    classSize: s.class_size === null ? "" : String(s.class_size),
    notes: s.notes,
  };
}

export function ConfirmForm({
  order,
  preset,
  disabled,
  onSubmit,
}: {
  order: LessonChatOrder;
  preset: ConfirmPreset | null;
  disabled: boolean;
  /** Вернул текст — заказ не ушёл, текст показывается у кнопки. */
  onSubmit: (body: LessonChatConfirmIn) => Promise<string | null>;
}) {
  const { t } = useLang();
  const [form, setForm] = useState<FormState>(() => fromSource(preset ?? order));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* Ключ того, что в заказе касается формы: меняется — значит, учитель сказал
     это в чате, и форма берёт сказанное. Первый ключ пропускаем — там уже
     лежит предвыбор, в том числе копии */
  const orderKey = JSON.stringify([
    order.kinds,
    order.engagement_level,
    order.difficulty_level,
    order.class_size,
    order.notes,
  ]);
  const seenKey = useRef(orderKey);
  useEffect(() => {
    if (seenKey.current === orderKey) return;
    seenKey.current = orderKey;
    setForm(fromSource(order));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderKey]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setError(null);
    setForm((f) => ({ ...f, [key]: value }));
  };

  const toggleKind = (kind: LessonMaterialKind) => {
    const on = form.kinds.includes(kind);
    /* Порядок — как в списке галочек, чтобы запрос не зависел от порядка кликов */
    set(
      "kinds",
      KIND_ORDER.filter((k) => (k === kind ? !on : form.kinds.includes(k))),
    );
  };

  const sizeText = form.classSize.trim();
  const size = sizeText === "" ? null : Number(sizeText);
  const sizeBad =
    size !== null && (!Number.isInteger(size) || size < CLASS_SIZE_MIN || size > CLASS_SIZE_MAX);

  const kindsProblem =
    form.kinds.length === 0
      ? t.laOrderNothing
      : form.kinds.includes("answer_key") && !form.kinds.some((k) => ANSWER_KEY_SOURCES.includes(k))
        ? t.laOrderKeysNeed
        : null;

  const submit = async () => {
    if (kindsProblem || sizeBad) return;
    setSubmitting(true);
    setError(null);
    const err = await onSubmit({
      kinds: form.kinds,
      engagement_level: form.engagement,
      difficulty_level: form.difficulty,
      /* Пустое поле — стереть сказанное в чате: учитель очистил его сам */
      class_size: size,
      notes: form.notes.trim(),
    });
    setSubmitting(false);
    if (err) setError(err);
  };

  const off = disabled || submitting;

  return (
    <section className="card card-pad stack g20" aria-label={t.laOrderWhat}>
      <fieldset className="stack g4" style={{ border: "none", margin: 0, padding: 0 }}>
        <legend className="h3" style={{ marginBottom: 8 }}>
          {t.laOrderWhat}
        </legend>
        {KIND_ORDER.map((kind) => (
          <label key={kind} className="check">
            <input
              type="checkbox"
              checked={form.kinds.includes(kind)}
              disabled={off}
              onChange={() => toggleKind(kind)}
            />
            <span className="check-box">
              <IconCheck size={14} />
            </span>
            <span className="stack g2">
              <span className="check-label">{kindTitle(t, kind)}</span>
              <span className="caption muted">{t.laKindHints[kind]}</span>
            </span>
          </label>
        ))}
        {kindsProblem && <span className="error-text">{kindsProblem}</span>}
      </fieldset>

      <Levels
        name="la-engagement"
        question={t.laEngagementQ}
        values={ENGAGEMENT_LEVELS}
        value={form.engagement}
        title={(v) => t.laEngagement[v]}
        hint={(v) => t.laEngagementHints[v]}
        disabled={off}
        onChange={(v) => set("engagement", v)}
      />

      <Levels
        name="la-difficulty"
        question={t.laDifficultyQ}
        values={DIFFICULTY_LEVELS}
        value={form.difficulty}
        title={(v) => t.laDifficulty[v]}
        hint={(v) => t.laDifficultyHints[v]}
        disabled={off}
        onChange={(v) => set("difficulty", v)}
      />

      <div className="stack g12">
        <p className="small muted pretty">{t.laOrderOptional}</p>
        <div className="field">
          <label className="label" htmlFor="la-class-size">
            {t.laOrderClassSize} <span className="label-optional">· {t.optional}</span>
          </label>
          <input
            id="la-class-size"
            className={`input ${sizeBad ? "input-error" : ""}`}
            type="number"
            inputMode="numeric"
            min={CLASS_SIZE_MIN}
            max={CLASS_SIZE_MAX}
            step={1}
            value={form.classSize}
            disabled={off}
            onChange={(e) => set("classSize", e.target.value)}
            style={{ maxWidth: 140 }}
          />
          {sizeBad && <span className="error-text">{t.laChatClassSizeBad}</span>}
        </div>
        <div className="field">
          <label className="label" htmlFor="la-notes">
            {t.laOrderNotes} <span className="label-optional">· {t.optional}</span>
          </label>
          <textarea
            id="la-notes"
            className="input"
            value={form.notes}
            maxLength={NOTES_MAX}
            placeholder={t.laOrderNotesPh}
            lang={order.lang ? contentLang(order.lang) : undefined}
            disabled={off}
            onChange={(e) => set("notes", e.target.value)}
            style={{ minHeight: 80 }}
          />
        </div>
      </div>

      {error && <Note kind="warning">{error}</Note>}

      <Button
        size="lg"
        block
        loading={submitting}
        disabled={disabled || Boolean(kindsProblem) || sizeBad}
        onClick={() => void submit()}
      >
        {t.laOrderGo}
      </Button>
    </section>
  );
}

/** Вопрос уровня: три варианта с подсказкой — кнопки в ряд не влезают в 390px. */
function Levels<V extends string>({
  name,
  question,
  values,
  value,
  title,
  hint,
  disabled,
  onChange,
}: {
  name: string;
  question: string;
  values: V[];
  value: V;
  title: (v: V) => string;
  hint: (v: V) => string;
  disabled: boolean;
  onChange: (v: V) => void;
}) {
  return (
    <fieldset className="stack g4" style={{ border: "none", margin: 0, padding: 0 }}>
      <legend className="label" style={{ fontSize: 15, marginBottom: 6 }}>
        {question}
      </legend>
      {values.map((v) => (
        <label key={v} className="check">
          <input
            type="radio"
            name={name}
            checked={value === v}
            disabled={disabled}
            onChange={() => onChange(v)}
          />
          <span className="check-box round">
            <IconCheck size={14} />
          </span>
          <span className="stack g2">
            <span className="check-label">{title(v)}</span>
            <span className="caption muted">{hint(v)}</span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}
