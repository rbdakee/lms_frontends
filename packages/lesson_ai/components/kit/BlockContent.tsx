"use client";

/**
 * Содержимое блока глазами учителя — по форме значения, а не по схеме вида
 * (почему — в `shape.ts`). Этим же рендером показываются версии в истории:
 * сравнивать учителю легче, когда версия выглядит как блок.
 *
 * Язык разметки ставит тот, кто зовёт, — `lang` комплекта: здесь текст
 * документа, а подписи полей — на языке интерфейса.
 */

import type { CSSProperties } from "react";
import type { LessonMaterialKind } from "@lms/api";
import { useLang } from "@lms/ui/lang";
import { ANSWER_KEY_SOURCES, blockTitle, enumValue, fieldTitle } from "../../labels";
import { ENUMS, isObj, orderedKeys } from "./shape";

const TEXT: CSSProperties = { margin: 0, whiteSpace: "pre-wrap", overflowWrap: "anywhere" };
const LIST: CSSProperties = { margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 4 };

export function BlockContent({
  value,
  kind,
  field,
}: {
  value: unknown;
  /** Вид материала: от него зависит, приглушать ли ответы задач */
  kind: LessonMaterialKind;
  /** Имя поля, под которым лежит значение, — по нему узнаются перечисления */
  field?: string;
}) {
  const { t } = useLang();

  if (value === null || value === undefined || value === "") {
    return <span className="caption muted-3">{t.laBlockEmpty}</span>;
  }
  if (typeof value === "boolean") return <span className="small">{value ? t.laYes : t.laNo}</span>;
  if (typeof value === "number") return <span className="small">{value}</span>;
  if (typeof value === "string") {
    if (field && ENUMS[field]) return <span className="small">{enumValue(t, value)}</span>;
    /* В ключах `block` — имя блока-источника: «cards_core» учителю ничего не скажет */
    if (field === "block") return <span className="small">{blockTitle(t, "", value)}</span>;
    return (
      <p className="small" style={TEXT}>
        {value}
      </p>
    );
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="caption muted-3">{t.laBlockEmpty}</span>;
    const flat = value.every((v) => !isObj(v) && !Array.isArray(v));
    return (
      <ol style={{ ...LIST, listStyle: flat ? "disc" : "decimal", gap: flat ? 4 : 12 }}>
        {value.map((v, i) => (
          <li key={i} className="small">
            <BlockContent value={v} kind={kind} field={field} />
          </li>
        ))}
      </ol>
    );
  }

  if (isObj(value)) {
    return (
      <dl className="stack g8" style={{ margin: 0 }}>
        {/* Пустое поле внутри объекта не показываем: «Пометка — пусто» учителю
            ничего не говорит, а в документ оно и так не печатается. Пустой блок
            целиком по-прежнему пишет «пусто» — там это ответ на вопрос */}
        {orderedKeys(value).filter((k) => !isEmpty(value[k])).map((k) => {
          /* Ответ ученику не печатается, он уходит в ключи — но учителю
             полезен рядом с задачей, поэтому виден, только тише */
          const quiet = k === "answer" && ANSWER_KEY_SOURCES.includes(kind);
          return (
            <div key={k} className="stack g2" style={quiet ? { color: "var(--text-2)" } : undefined}>
              <dt className="caption muted-3" style={{ fontWeight: 700 }}>
                {fieldTitle(t, k)}
                {quiet && <span style={{ fontWeight: 500 }}> · {t.laAnswerNotPrinted}</span>}
              </dt>
              <dd style={{ margin: 0 }}>
                <BlockContent value={value[k]} kind={kind} field={k} />
              </dd>
            </div>
          );
        })}
      </dl>
    );
  }

  return <span className="small">{String(value)}</span>;
}

function isEmpty(v: unknown): boolean {
  return v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0);
}
