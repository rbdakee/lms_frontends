"use client";

/**
 * Карточка заказа — то, что сервер уже записал: цель, класс, язык обучения,
 * тема и чего ещё не хватает. Правда здесь — `order` из ответа сервера, свою
 * копию карточка держит только для поля темы, пока учитель его печатает.
 *
 * Язык обучения выбирает учитель — кнопкой здесь или словами в чате. Язык
 * интерфейса сюда не подставляется никогда (бриф, раздел 1).
 */

import { useEffect, useState } from "react";
import type { LessonChatOrder, LessonChatOrderPatch, LessonLang } from "@lms/api";
import { Button } from "@lms/ui";
import { IconChevronDown } from "@lms/ui/icons";
import { useLang } from "@lms/ui/lang";
import { contentLang } from "../../labels";
import { ObjectiveText } from "./ObjectiveCards";

const TOPIC_MAX = 200;

export function OrderCard({
  order,
  disabled,
  collapsible,
  onPatch,
  onPickObjective,
}: {
  order: LessonChatOrder;
  disabled: boolean;
  /** Телефон: карточка сверху, свёрнута до строки — ленте нужно место */
  collapsible: boolean;
  onPatch: (body: LessonChatOrderPatch) => Promise<void>;
  onPickObjective: () => void;
}) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);

  const summary = [
    order.objective?.code,
    order.grade !== null ? t.laGrade(order.grade) : null,
    order.lang ? (order.lang === "ru" ? t.laLangRu : t.laLangKz) : null,
  ].filter(Boolean);

  const body = (
    <div className="stack g16">
      <div className="stack g6">
        <span className="label">{t.laObjectiveChosen}</span>
        {order.objective ? (
          <ObjectiveText o={order.objective} />
        ) : (
          <span className="small muted">{t.laChatNoObjective}</span>
        )}
        <div>
          <Button size="sm" variant="secondary" disabled={disabled} onClick={onPickObjective}>
            {order.objective ? t.laObjectiveChange : t.laObjectivePick}
          </Button>
        </div>
      </div>

      {order.grade !== null && <span className="small">{t.laGrade(order.grade)}</span>}

      <LangPicker lang={order.lang} disabled={disabled} onPick={(lang) => void onPatch({ lang })} />

      <TopicField id="la-topic" order={order} disabled={disabled} onSave={(topic) => onPatch({ topic })} />

      {!order.ready && order.missing.length > 0 && (
        <div className="stack g4">
          <span className="small muted">{t.laOrderMissing}</span>
          <ul className="small" style={{ margin: 0, paddingLeft: 20 }}>
            {order.missing.map((m) => (
              <li key={m}>{t.laMissing[m]}</li>
            ))}
          </ul>
        </div>
      )}
      {order.ready && <span className="small" style={{ color: "var(--success-strong)" }}>{t.laChatOrderReady}</span>}
    </div>
  );

  if (!collapsible) {
    return (
      <section className="card card-pad stack g16" aria-label={t.laOrderTitle}>
        <h2 className="h3">{t.laOrderTitle}</h2>
        {body}
      </section>
    );
  }

  return (
    <section className="card" aria-label={t.laOrderTitle}>
      <button
        type="button"
        className="row g10"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          padding: "12px 16px",
          border: "none",
          background: "none",
          cursor: "pointer",
          textAlign: "left",
          color: "inherit",
        }}
      >
        <div className="stack g2 grow" style={{ minWidth: 0 }}>
          <strong className="small">{t.laOrderTitle}</strong>
          <span className="caption muted" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {summary.length > 0
              ? summary.join(" · ")
              : `${t.laOrderMissing} ${order.missing.map((m) => t.laMissing[m]).join(", ")}`}
          </span>
        </div>
        <IconChevronDown
          size={18}
          style={{ flexShrink: 0, transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }}
        />
      </button>
      {open && <div style={{ padding: "0 16px 16px" }}>{body}</div>}
    </section>
  );
}

/** «Русский» / «Қазақша» — и в карточке, и вопросом в ленте. */
export function LangPicker({
  lang,
  disabled,
  question,
  onPick,
}: {
  lang: LessonLang | null;
  disabled: boolean;
  /** Подпись-вопрос из брифа вместо сухой «язык обучения» — для ленты */
  question?: boolean;
  onPick: (lang: LessonLang) => void;
}) {
  const { t } = useLang();
  return (
    <div className="stack g6">
      <span className={question ? "small" : "label"}>{question ? t.laLangQ : t.laChatLangLabel}</span>
      <div className="row g6 wrap">
        {(["ru", "kz"] as const).map((l) => (
          <button
            key={l}
            type="button"
            className="chip"
            data-active={lang === l}
            aria-pressed={lang === l}
            disabled={disabled}
            onClick={() => lang !== l && onPick(l)}
          >
            {l === "ru" ? t.laLangRu : t.laLangKz}
          </button>
        ))}
      </div>
      {lang && !question && <span className="caption muted-3">{t.laDocsLang[lang]}</span>}
    </div>
  );
}

/** Тема в плане — и в карточке, и вопросом в ленте. */
export function TopicField({
  id,
  order,
  disabled,
  question,
  onSave,
}: {
  /** Поле бывает на экране дважды — в карточке и в ленте, `id` у каждого свой */
  id: string;
  order: LessonChatOrder;
  disabled: boolean;
  /** Подпись-вопрос вместо сухой «Тема в плане» — для ленты */
  question?: boolean;
  onSave: (topic: string | null) => Promise<void>;
}) {
  const { t } = useLang();
  const saved = order.topic ?? "";
  const [value, setValue] = useState(saved);
  const [saving, setSaving] = useState(false);

  /* Тему могли назвать в чате — поле догоняет записанное сервером */
  useEffect(() => setValue(saved), [saved]);

  const trimmed = value.trim();
  const changed = trimmed !== saved;

  const save = async () => {
    setSaving(true);
    /* Пустое поле — стереть тему: так её можно назвать заново словами */
    await onSave(trimmed || null);
    setSaving(false);
  };

  return (
    <form
      className="field"
      onSubmit={(e) => {
        e.preventDefault();
        if (changed) void save();
      }}
    >
      <label className={question ? "small" : "label"} htmlFor={id}>
        {question ? t.laChatTopicQ : t.laOrderTopic}
      </label>
      <input
        id={id}
        className="input"
        value={value}
        maxLength={TOPIC_MAX}
        placeholder={t.laOrderTopicPh}
        lang={order.lang ? contentLang(order.lang) : undefined}
        disabled={disabled}
        onChange={(e) => setValue(e.target.value)}
      />
      <div>
        <Button type="submit" size="sm" variant="secondary" loading={saving} disabled={disabled || !changed}>
          {t.laOrderTopicSave}
        </Button>
      </div>
    </form>
  );
}
