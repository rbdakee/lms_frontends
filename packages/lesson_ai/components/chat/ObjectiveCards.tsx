"use client";

/**
 * Найденные цели обучения в ленте.
 *
 * Рисуются из `tool_result` — из строк справочника, а не из текста модели
 * (`CONTRACT.md`, L6): в комплект уходит ровно то, что учитель видел здесь.
 */

import type { LessonChatObjective } from "@lms/api";
import { Badge, Button } from "@lms/ui";
import { IconCheck } from "@lms/ui/icons";
import { useLang } from "@lms/ui/lang";
import { contentLang } from "../../labels";

/* Поиск отдаёт до десяти целей, лучшие сверху. Лента — не список: дальше
   трёх учитель идёт в «Показать другие», где есть поиск */
const SHOWN = 3;

export function ObjectiveCards({
  items,
  chosenId,
  disabled,
  onYes,
  onOthers,
}: {
  items: LessonChatObjective[];
  chosenId: number | null;
  disabled: boolean;
  onYes: (o: LessonChatObjective) => void;
  onOthers: (o: LessonChatObjective) => void;
}) {
  const { t } = useLang();
  if (items.length === 0) return null;
  return (
    <div className="stack g8" style={{ maxWidth: 560 }}>
      {items.slice(0, SHOWN).map((o) => (
        <div key={o.id} className="card card-pad stack g8">
          <ObjectiveText o={o} />
          <div className="row g8 wrap">
            {o.id === chosenId ? (
              <Badge kind="accepted" icon={<IconCheck size={13} />}>
                {t.laChatPicked}
              </Badge>
            ) : (
              <Button size="sm" disabled={disabled} onClick={() => onYes(o)}>
                {t.laObjectiveYes}
              </Button>
            )}
          </div>
        </div>
      ))}
      <div>
        <Button size="sm" variant="secondary" disabled={disabled} onClick={() => onOthers(items[0])}>
          {t.laObjectiveOthers}
        </Button>
      </div>
    </div>
  );
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
