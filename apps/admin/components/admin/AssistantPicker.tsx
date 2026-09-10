"use client";

/**
 * Карточка выбора человека — разделы 5 и 10 `ASSISTANT_BRIEF.md`.
 *
 * Встаёт под карточкой вызова `teachers_find`. Поиск шёл на сервере, и назад
 * ассистенту пришли `user_id`, регион, школа и курсы — **имён в ответе нет**.
 * Имя в строке подставляет браузер обычной админской ручкой
 * `/admin/teachers/{id}`, право на которую у админа и так есть: ассистент
 * человека по имени не опознаёт и опознавать не должен.
 *
 * **Клик по кнопке уровня и есть выдача допуска.** Отдельного «сохранить»
 * нет: допуск живёт до конца суток в этом чате, повторный клик меняет
 * уровень. При этом допуск — не подтверждение: правку данных человека всё
 * равно подтверждает кнопка «Выполнить» в ленте.
 *
 * Курс подписан площадкой не для красоты: курс общий, а доступы, цена
 * и прогресс у каждой площадки свои — строка без площадки внутри админки
 * ничего не говорит (раздел 4).
 */

import { Empty } from "@lms/ui";
import { IconCheck, IconSearch } from "@lms/ui/icons";
import { useLang } from "@lms/ui/lang";
import { teacherMask, useTeacherName } from "@/components/admin/assistantApi";
import { usePlatformName } from "@/components/admin/platforms";

export interface PickerRow {
  user_id: number;
  /** Маска сервера: «Учитель #418» — так этот человек назван у ассистента. */
  ref: string;
  region: string;
  school: string;
  courses: { course_id: number; title: string; platform: string }[];
}

function PickRow({
  row,
  level,
  onPick,
}: {
  row: PickerRow;
  level?: "read" | "write";
  onPick: (userId: number, level: "read" | "write") => void;
}) {
  const { t } = useLang();
  const name = useTeacherName(row.user_id);
  const platformName = usePlatformName();
  /* Имя ещё не приехало — хук отдаёт ту же маску, что и сервер; показывать
     её дважды незачем */
  const named = name !== teacherMask(row.user_id);
  const where = [row.region, row.school].filter(Boolean).join(" · ");

  return (
    <div className="as-pick-row stack g8">
      <div className="stack g2">
        <div className="row g8 wrap">
          <strong className="small">{named ? name : row.ref}</strong>
          {named && <span className="caption muted-3">{row.ref}</span>}
        </div>
        {where && <span className="caption muted-3">{where}</span>}
        {row.courses.length > 0 && (
          <span className="caption muted-3">
            {row.courses.map((c) => `${c.title} · ${platformName(c.platform)}`).join("; ")}
          </span>
        )}
      </div>

      <div className="row g6 wrap">
        <span className="caption muted-3">{t.asPickLevel}</span>
        {(["read", "write"] as const).map((lv) => (
          <button
            key={lv}
            type="button"
            className="chip"
            data-active={level === lv || undefined}
            aria-pressed={level === lv}
            onClick={() => onPick(row.user_id, lv)}
          >
            {level === lv && <IconCheck size={13} />}
            {lv === "write" ? t.asGrantWrite : t.asGrantRead}
          </button>
        ))}
      </div>
    </div>
  );
}

export function AssistantPicker({
  rows,
  granted,
  onPick,
}: {
  rows: PickerRow[];
  granted: Record<number, "read" | "write">;
  onPick: (userId: number, level: "read" | "write") => void;
}): React.JSX.Element {
  const { t } = useLang();

  return (
    <div className="card card-pad stack g12">
      <div className="stack g2">
        <strong className="small">{t.asPickTitle}</strong>
        <span className="caption muted-3">{t.asPickHint}</span>
      </div>

      {rows.length === 0 ? (
        <Empty icon={<IconSearch size={34} />} title={t.asPickNobody} />
      ) : (
        <div className="stack g10">
          {rows.map((r) => (
            <PickRow key={r.user_id} row={r} level={granted[r.user_id]} onPick={onPick} />
          ))}
        </div>
      )}

      <style>{`
        .as-pick-row + .as-pick-row { padding-top: 10px; border-top: 1px solid var(--border); }
      `}</style>
    </div>
  );
}
