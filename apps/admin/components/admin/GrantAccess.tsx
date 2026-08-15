"use client";

/**
 * Модалка «Открыть доступ к курсу» — одна и та же в заявках (5.26)
 * и в карточке учителя (5.22). В заявке курс и учитель уже подставлены.
 *
 * Отметка «оплата получена» существует только здесь: платформа денег
 * не принимает, админ подтверждает оплату, полученную вне системы.
 */

import { useState } from "react";
import { catalogCourses, type Course } from "@lms/prototype/data";
import { price as fmtPrice } from "@lms/ui/i18n";
import { useStore } from "@lms/prototype";
import { Button, Note, Sheet } from "@lms/ui";
import { IconCheck } from "@lms/ui/icons";

export function GrantAccessSheet({
  open,
  onClose,
  teacherName,
  course,
  onGrant,
}: {
  open: boolean;
  onClose: () => void;
  teacherName: string;
  /** Уже выбранный курс — из заявки. Не задан: админ выбирает сам */
  course?: Course;
  onGrant: (courseId: string, paid: boolean, note: string) => void;
}) {
  const { lang } = useStore();
  const [courseId, setCourseId] = useState(course?.id ?? catalogCourses[0].id);
  const [paid, setPaid] = useState(false);
  const [note, setNote] = useState("");

  const selected = course ?? catalogCourses.find((c) => c.id === courseId);

  const close = () => {
    setPaid(false);
    setNote("");
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={close}
      title="Открыть доступ к курсу"
      footer={
        <div className="stack g8">
          <Button
            block
            size="lg"
            onClick={() => {
              onGrant(selected?.id ?? courseId, paid, note.trim());
              close();
            }}
          >
            Открыть доступ
          </Button>
          <Button variant="secondary" block onClick={close}>
            Отмена
          </Button>
        </div>
      }
    >
      <div className="stack g14">
        <p className="small muted pretty">
          Курс появится у учителя в «Моих курсах», ему придёт уведомление в колокольчик,
          связанная заявка закроется автоматически.
        </p>

        <div className="field">
          <label className="label">Учитель</label>
          <input className="input" value={teacherName} disabled />
        </div>

        <div className="field">
          <label className="label">Курс</label>
          {course ? (
            <input className="input" value={course.title} disabled />
          ) : (
            <select
              className="input"
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
            >
              {catalogCourses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title} · {fmtPrice(c.price, lang)}
                </option>
              ))}
            </select>
          )}
          {selected && (
            <span className="hint">
              Цена курса — {fmtPrice(selected.price, lang)}. Оплата принимается вне платформы.
            </span>
          )}
        </div>

        <label className="check">
          <input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} />
          <span className="check-box">
            <IconCheck size={14} />
          </span>
          <span className="check-label">Оплата получена</span>
        </label>

        <div className="field">
          <label className="label">
            Комментарий <span className="label-optional">· необязательно</span>
          </label>
          <textarea
            className="input"
            style={{ minHeight: 80 }}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Например: перевод Kaspi 45 000 ₸, 14 августа"
          />
          <span className="hint">Сохранится в истории заявки</span>
        </div>

        {!paid && (
          <Note kind="muted">
            <span className="small">
              Можно открыть доступ и без отметки об оплате — например, по договорённости.
              Отметка нужна только для истории.
            </span>
          </Note>
        )}
      </div>
    </Sheet>
  );
}
