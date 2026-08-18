"use client";

/**
 * Модалка «Открыть доступ к курсу» из заявки — раздел 5.26 брифа.
 *
 * Единственный путь выдачи доступа: `POST /admin/enrollments`. Одна
 * транзакция на сервере — создаётся доступ, заявка закрывается статусом
 * «Доступ выдан», учителю уходит уведомление в колокольчик.
 *
 * Отметка «оплата получена» существует только здесь: платформа денег
 * не принимает, админ подтверждает оплату, полученную вне системы.
 *
 * Прототипная модалка `GrantAccess.tsx` (с выбором курса) остаётся карточке
 * учителя до её сессии.
 */

import { useState } from "react";
import { api, isApiError, type AdminLead, type Enrollment } from "@lms/api";
import { price as fmtPrice } from "@lms/ui/i18n";
import { useStore } from "@lms/prototype";
import { Button, Note, Sheet } from "@lms/ui";
import { IconCheck } from "@lms/ui/icons";

export function GrantLeadSheet({
  lead,
  open,
  onClose,
  onGranted,
}: {
  lead: AdminLead;
  open: boolean;
  onClose: () => void;
  /** Доступ выдан (или уже был выдан) — экран перечитывает заявки */
  onGranted: () => void;
}) {
  const { lang, toast } = useStore();
  const [paid, setPaid] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const teacherName = [
    lead.teacher.last_name,
    lead.teacher.first_name,
    lead.teacher.middle_name,
  ]
    .filter(Boolean)
    .join(" ");

  const close = () => {
    setPaid(false);
    setNote("");
    onClose();
  };

  const grant = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await api<Enrollment>("/admin/enrollments", {
        method: "POST",
        json: {
          user_id: lead.teacher.id,
          course_id: lead.course.id,
          paid,
          note: note.trim() || null,
        },
      });
      toast(
        `Доступ открыт · ${lead.teacher.first_name || teacherName} — учителю ушло уведомление`,
        "success",
      );
      onGranted();
      close();
    } catch (e) {
      if (isApiError(e, "already_enrolled")) {
        toast(e.message, "info");
        onGranted();
        close();
      } else {
        toast(isApiError(e) ? e.message : "Не удалось открыть доступ", "error");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={close}
      title="Открыть доступ к курсу"
      footer={
        <div className="stack g8">
          <Button block size="lg" loading={busy} onClick={grant}>
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
          <input className="input" value={lead.course.title} disabled />
          <span className="hint">
            Цена курса — {fmtPrice(lead.course.price ?? undefined, lang)}. Оплата
            принимается вне платформы.
          </span>
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
          <span className="hint">Сохранится в заявке</span>
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
