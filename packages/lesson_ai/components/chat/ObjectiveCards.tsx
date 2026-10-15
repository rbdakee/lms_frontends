"use client";

/**
 * Найденные цели обучения в ленте.
 *
 * Рисуются из `tool_result` — из строк справочника, а не из текста модели
 * (`CONTRACT.md`, L6): в урок уходит ровно то, что учитель видел здесь.
 * Целей на урок может быть несколько (решение владельца 15.10.2026): учитель
 * отмечает их круглыми чекбоксами, порядок отметок — порядок целей в уроке.
 */

import type { LessonChatObjective } from "@lms/api";
import { Button, Note } from "@lms/ui";
import { useLang } from "@lms/ui/lang";
import { contentLang } from "../../labels";

/* Поиск отдаёт до десяти целей, лучшие сверху. Лента — не список: дальше
   трёх учитель идёт в «Показать другие», где есть поиск */
const SHOWN = 3;
/* Больше этого — мягкая пометка, не ошибка: сколько целей, решает учитель */
export const MANY_OBJECTIVES = 3;

/** Цели одного урока — из одной программы: предмет, класс и редакция совпадают.
    Окончательно проверяет сервер, здесь — подсказка до отправки. */
export function sameProgram(a: LessonChatObjective, b: LessonChatObjective): boolean {
  return a.subject_code === b.subject_code && a.grade === b.grade && a.lang === b.lang;
}

/** Цель отмечается или снимается; отмеченные идут в порядке отметок. */
export function toggled(picked: LessonChatObjective[], o: LessonChatObjective): LessonChatObjective[] {
  return picked.some((p) => p.id === o.id) ? picked.filter((p) => p.id !== o.id) : [...picked, o];
}

export function ObjectiveCards({
  items,
  picked,
  committedIds,
  disabled,
  onToggle,
  onDone,
  onOthers,
}: {
  items: LessonChatObjective[];
  picked: LessonChatObjective[];
  /** Цели, которые уже записаны в урок: «Готово» нужно, только когда набор иной */
  committedIds: number[];
  disabled: boolean;
  onToggle: (o: LessonChatObjective) => void;
  onDone: () => void;
  onOthers: (o: LessonChatObjective) => void;
}) {
  const { t } = useLang();
  if (items.length === 0) return null;
  return (
    <div className="stack g8" style={{ maxWidth: 560 }}>
      {items.slice(0, SHOWN).map((o) => (
        <ObjectiveChoice key={o.id} o={o} picked={picked} disabled={disabled} onToggle={onToggle} />
      ))}
      <div className="row g8 wrap">
        <DoneBar picked={picked} committedIds={committedIds} disabled={disabled} onDone={onDone} />
        <Button size="sm" variant="secondary" disabled={disabled} onClick={() => onOthers(items[0])}>
          {t.laObjectiveOthers}
        </Button>
      </div>
      <ManyNote count={picked.length} />
    </div>
  );
}

/** Карточка цели с круглым чекбоксом. Цели другой программы серые — выбрать
    их нельзя, пока отмечена цель первой, и подпись объясняет почему. */
export function ObjectiveChoice({
  o,
  picked,
  disabled,
  onToggle,
}: {
  o: LessonChatObjective;
  picked: LessonChatObjective[];
  disabled: boolean;
  onToggle: (o: LessonChatObjective) => void;
}) {
  const { t } = useLang();
  const index = picked.findIndex((p) => p.id === o.id);
  const checked = index >= 0;
  const blocked = !checked && picked.length > 0 && !sameProgram(picked[0], o);
  return (
    <div className="card card-pad row g12" style={{ alignItems: "flex-start", opacity: blocked ? 0.55 : 1 }}>
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        aria-label={t.laObjectiveCheck(o.code)}
        className="check-round"
        disabled={disabled || blocked}
        onClick={() => onToggle(o)}
      >
        {checked ? index + 1 : null}
      </button>
      <div className="stack g6 grow" style={{ minWidth: 0 }}>
        <ObjectiveText o={o} />
        {blocked && <span className="caption muted-3">{t.laObjectiveBlocked}</span>}
      </div>
    </div>
  );
}

/** «Готово (N)»: записывает набор в урок. Пока набор не менялся — кнопки нет. */
export function DoneBar({
  picked,
  committedIds,
  disabled,
  loading,
  onDone,
}: {
  picked: LessonChatObjective[];
  committedIds: number[];
  disabled: boolean;
  loading?: boolean;
  onDone: () => void;
}) {
  const { t } = useLang();
  const same =
    picked.length === committedIds.length && picked.every((p, i) => p.id === committedIds[i]);
  if (picked.length === 0 || same) return null;
  return (
    <Button size="sm" loading={loading} disabled={disabled} onClick={onDone}>
      {t.laObjectivesDone(picked.length)}
    </Button>
  );
}

/** Больше трёх целей — мягкая пометка: урок лучше сузить, но решает учитель. */
export function ManyNote({ count }: { count: number }) {
  const { t } = useLang();
  if (count <= MANY_OBJECTIVES) return null;
  return <Note kind="info">{t.laObjectivesMany}</Note>;
}

/**
 * Код, текст дословно, раздел и подраздел. Язык — редакции самой цели:
 * он известен точно, даже когда язык обучения ещё не выбран.
 */
export function ObjectiveText({ o }: { o: LessonChatObjective }) {
  return (
    <div className="stack g4" lang={contentLang(o.lang)}>
      <span className="small" style={{ fontWeight: 800 }}>
        {o.code}
        {o.marker && <span className="muted"> {o.marker}</span>}
      </span>
      <span className="pretty" style={{ fontSize: 15, lineHeight: "22px" }}>
        {o.text}
      </span>
      {(o.section || o.subsection) && (
        <span className="caption muted-3">
          {o.section}
          {o.subsection && ` › ${o.subsection}`}
        </span>
      )}
    </div>
  );
}

type ObjectiveLine = Pick<LessonChatObjective, "id" | "code" | "text" | "marker">;

/**
 * Цели урока компактно: одна — код и текст как есть; несколько — коды через
 * запятую в заголовке и раскрытие с текстами по порядку. Код и текст дословно
 * из справочника: их сверяет завуч.
 */
export function ObjectiveList({
  objectives,
  lang,
}: {
  objectives: ObjectiveLine[];
  lang?: "ru" | "kz";
}) {
  const { t } = useLang();
  const docLang = lang ? contentLang(lang) : undefined;
  if (objectives.length === 1) {
    const [o] = objectives;
    return (
      <p className="small pretty" lang={docLang} style={{ margin: 0 }}>
        <strong className="mono">
          {o.code}
          {o.marker}
        </strong>{" "}
        {o.text}
      </p>
    );
  }
  return (
    <details>
      <summary className="small" style={{ cursor: "pointer", fontWeight: 700 }}>
        <span className="mono">{objectives.map((o) => `${o.code}${o.marker}`).join(", ")}</span>
        <span className="muted"> · {t.laObjectivesTexts}</span>
      </summary>
      <ol className="small pretty stack g6" lang={docLang} style={{ margin: "8px 0 0", paddingLeft: 22 }}>
        {objectives.map((o) => (
          <li key={o.id}>
            <strong className="mono">
              {o.code}
              {o.marker}
            </strong>{" "}
            {o.text}
          </li>
        ))}
      </ol>
    </details>
  );
}
