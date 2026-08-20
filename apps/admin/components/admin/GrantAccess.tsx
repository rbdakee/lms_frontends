"use client";

/**
 * Модалка «Открыть доступ к курсу» из карточки учителя (5.22): курс админ
 * выбирает сам. Выдача из заявки — соседняя `GrantLead.tsx`, там курс уже
 * известен, и объединять их не нужно: разные экраны и разные входные данные.
 *
 * Единственный путь выдачи доступа: `POST /admin/enrollments`. Курсы берём
 * из `GET /admin/courses`, но показываем не все: черновика и скрытой версии
 * для площадки не существует, и выдача к ним отвечает 404 «Курс не найден».
 *
 * Отметка «оплата получена» существует только здесь: платформа денег
 * не принимает, админ подтверждает оплату, полученную вне системы.
 */

import { useState } from "react";
import {
  api,
  isApiError,
  qs,
  useLoad,
  type AdminCoursesPage,
  type Enrollment,
  type EnrollmentIn,
} from "@lms/api";
import { price as fmtPrice } from "@lms/ui/i18n";
import { useStore } from "@lms/prototype";
import { Button, Note, Sheet } from "@lms/ui";
import { IconCheck } from "@lms/ui/icons";

/** Статусы, при которых версия курса для площадки существует: у остальных выдача — 404. */
const ENROLLABLE: string[] = ["planned", "open", "closed"];

export function GrantAccessSheet({
  open,
  onClose,
  userId,
  teacherName,
  onGranted,
}: {
  open: boolean;
  onClose: () => void;
  userId: number;
  teacherName: string;
  /** Доступ выдан (или уже был выдан) — карточка учителя перечитывается */
  onGranted: () => void;
}) {
  const { lang, toast } = useStore();
  const [courseId, setCourseId] = useState<number | null>(null);
  const [paid, setPaid] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const courses = useLoad(
    () => api<AdminCoursesPage>(`/admin/courses${qs({ per_page: 100 })}`),
    [],
  );
  /* Фильтр по `status` у эндпоинта принимает одно значение, а нам нужны три,
     поэтому отбираем на месте. Черновик стоит в ответе первым (свежие сверху)
     и без этого оказался бы выбран по умолчанию */
  const items = (courses.data?.items ?? []).filter((c) =>
    ENROLLABLE.includes(c.status),
  );
  /* Пока админ не выбрал курс сам, выбран первый из списка */
  const selected = items.find((c) => c.id === courseId) ?? items[0];

  const close = () => {
    setPaid(false);
    setNote("");
    onClose();
  };

  const grant = async () => {
    if (!selected || busy) return;
    setBusy(true);
    try {
      await api<Enrollment>("/admin/enrollments", {
        method: "POST",
        json: {
          user_id: userId,
          course_id: selected.id,
          paid,
          note: note.trim() || null,
        } satisfies EnrollmentIn,
      });
      toast(`Доступ к «${selected.title}» открыт — учителю ушло уведомление`, "success");
      onGranted();
      close();
    } catch (e) {
      /* Доступ уже был выдан — это не ошибка админа, а гонка двух вкладок */
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
          <Button block size="lg" loading={busy} disabled={!selected} onClick={grant}>
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
          {courses.loading ? (
            <div className="row center" style={{ minHeight: 44 }}>
              <span className="spinner" style={{ width: 20, height: 20, color: "var(--primary)" }} />
            </div>
          ) : courses.error ? (
            <Note kind="warning">
              <div className="stack g8">
                <span className="small">Не удалось загрузить список курсов.</span>
                <Button variant="secondary" size="sm" onClick={courses.reload}>
                  Повторить
                </Button>
              </div>
            </Note>
          ) : (
            <select
              className="input"
              value={selected?.id ?? ""}
              onChange={(e) => setCourseId(Number(e.target.value))}
            >
              {items.map((c) => (
                <option key={c.id} value={c.id}>
                  {/* Язык версии — иначе два курса одной группы в списке
                      различаются только заголовком, и доступ уходит не к тому */}
                  {c.title} · {c.lang === "kz" ? "ҚАЗ" : "РУС"} ·{" "}
                  {fmtPrice(c.price ?? undefined, lang)}
                </option>
              ))}
            </select>
          )}
          {selected && (
            <span className="hint">
              Цена курса — {fmtPrice(selected.price ?? undefined, lang)}. Оплата принимается
              вне платформы.
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
          <span className="hint">
            {paid
              ? "Сохранится в истории выдачи доступа"
              : "Сохранится, только если отмечена оплата"}
          </span>
        </div>

        {/* Комментарий сервер записывает лишь вместе с отметкой об оплате
            (`paid_note`), поэтому без неё обещать сохранение нельзя */}
        {!paid && (
          <Note kind="muted">
            <span className="small">
              Доступ откроется и без отметки об оплате — например, по договорённости.
              Но комментарий тогда не сохранится: он живёт вместе с отметкой.
            </span>
          </Note>
        )}
      </div>
    </Sheet>
  );
}
