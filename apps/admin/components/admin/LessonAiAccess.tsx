"use client";

/**
 * Доступ к «Жоспару» в админке: блок в карточке учителя и окно выдачи.
 *
 * «Жоспар» — отдельный продукт (`TEACHER_AI_BRIEF`): доступ к нему выдаётся
 * руками после оплаты вне платформы, отдельно от курсов. Поэтому и блок
 * в карточке свой, а не ещё одна строка на вкладке «Курсы»: купивший курс
 * помощника не получает, и наоборот.
 *
 * Ручки — `/admin/lesson_ai/access` (`backend/CONTRACT.md`, L7). Выдача,
 * продление и выдача после снятия — одно действие `PUT`; снятие — `DELETE`,
 * комплекты учителя при этом не удаляются.
 *
 * Срок и цена владельцем ещё не решены: срок — необязательная дата, пусто —
 * без срока. Скажет владелец «бессрочно» — поле даты уходит из окна, и только.
 * Цены здесь нет и не будет: оплата вне платформы, у выдачи — отметка.
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  api,
  isApiError,
  useLoad,
  type LessonAccess,
  type LessonAccessCard,
  type LessonAccessGrantIn,
  type LessonAccessState,
} from "@lms/api";
import { Badge, Button, Note, Sheet, type BadgeKind } from "@lms/ui";
import { dayTime, dayYear } from "@lms/ui/i18n";
import { IconCheck, IconSparkle } from "@lms/ui/icons";
import { useLang } from "@lms/ui/lang";
import { useToast } from "@lms/ui/toast";
import { fieldErrors } from "@/lib/fieldErrors";

/* ============ Запросы ============ */

export function getLessonAccess(userId: number): Promise<LessonAccessCard> {
  return api<LessonAccessCard>(`/admin/lesson_ai/access/${userId}`);
}

export function grantLessonAccess(userId: number, body: LessonAccessGrantIn): Promise<LessonAccessCard> {
  return api<LessonAccessCard>(`/admin/lesson_ai/access/${userId}`, { method: "PUT", json: body });
}

export function revokeLessonAccess(userId: number): Promise<void> {
  return api<void>(`/admin/lesson_ai/access/${userId}`, { method: "DELETE" });
}

/* ============ Значок состояния ============ */

type Lang = ReturnType<typeof useLang>;

const STATE_KIND: Record<LessonAccessState, BadgeKind> = {
  active: "accepted",
  expired: "rework",
  revoked: "locked",
};

export function LessonAccessBadge({ state }: { state: LessonAccessState }) {
  const { t } = useLang();
  return (
    <Badge kind={STATE_KIND[state]} icon={state === "active" ? <IconCheck size={13} /> : undefined}>
      {t.laAdmState[state]}
    </Badge>
  );
}

/** «по 31 декабря 2026» или «без срока» — срок включительно, по Алматы. */
export function accessUntil(t: Lang["t"], lang: Lang["lang"], a: LessonAccess): string {
  return a.expires_on ? t.laAdmUntil(dayYear(a.expires_on, lang)) : t.laAdmNoEnd;
}

/* ============ Блок в карточке учителя ============ */

export function LessonAiAccessBlock({ teacherId }: { teacherId: number }) {
  const { t, lang } = useLang();
  const toast = useToast();
  const card = useLoad(() => getLessonAccess(teacherId), [teacherId]);
  const [grantOpen, setGrantOpen] = useState(false);
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [revoking, setRevoking] = useState(false);

  const access = card.data?.access ?? null;

  const revoke = async () => {
    setRevoking(true);
    try {
      await revokeLessonAccess(teacherId);
      setRevokeOpen(false);
      toast(t.laAdmRevoked, "success");
      card.reload();
    } catch (e) {
      toast(isApiError(e) ? e.message : t.laAdmError, "error");
    } finally {
      setRevoking(false);
    }
  };

  return (
    <div className="card card-pad stack g10">
      <div className="row between g8">
        <h2 className="h3 row g8">
          <IconSparkle size={18} />
          {t.laAdmBlock}
        </h2>
        {access && <LessonAccessBadge state={access.status} />}
      </div>

      {card.loading ? (
        <div className="row center" style={{ minHeight: 60 }}>
          <span className="spinner" style={{ width: 20, height: 20, color: "var(--primary)" }} />
        </div>
      ) : card.error ? (
        <div className="row between g10">
          <span className="small muted">{t.loadError}</span>
          <Button variant="secondary" size="sm" onClick={card.reload}>
            {t.retry}
          </Button>
        </div>
      ) : !access ? (
        <span className="small muted">{t.laAdmNever}</span>
      ) : (
        <dl className="stack g6" style={{ margin: 0 }}>
          <div className="row between g10">
            <dt className="caption muted">{t.laAdmColUntil}</dt>
            <dd className="small" style={{ margin: 0, fontWeight: 600 }}>
              {accessUntil(t, lang, access)}
            </dd>
          </div>
          <div className="row between g10" style={{ alignItems: "flex-start" }}>
            <dt className="caption muted">{t.laAdmColPaid}</dt>
            <dd className="small" style={{ margin: 0, textAlign: "right" }}>
              {access.paid ? t.laAdmPaid : t.laAdmNotPaid}
              {access.paid_note && <span className="caption muted-3 stack">{access.paid_note}</span>}
            </dd>
          </div>
          <span className="caption muted-3">
            {access.status === "revoked" && access.revoked_at
              ? t.laAdmRevokedAt(dayTime(access.revoked_at, lang))
              : t.laAdmGrantedBy(access.granted_by?.name ?? "—", dayTime(access.granted_at, lang))}
          </span>
        </dl>
      )}

      {!card.loading && !card.error && (
        <div className="stack g8">
          <Button
            variant={access?.status === "active" ? "secondary" : "primary"}
            block
            onClick={() => setGrantOpen(true)}
          >
            {!access ? t.laAdmGrant : access.status === "active" ? t.laAdmExtend : t.laAdmRegrant}
          </Button>
          {access?.status === "active" && (
            <Button variant="danger-soft" block onClick={() => setRevokeOpen(true)}>
              {t.laAdmRevoke}
            </Button>
          )}
          <Link href="/lesson_ai/access" className="caption" style={{ color: "var(--primary)", fontWeight: 700 }}>
            {t.laAdmOpenList}
          </Link>
        </div>
      )}

      <GrantLessonAiSheet
        open={grantOpen}
        onClose={() => setGrantOpen(false)}
        teacherId={teacherId}
        current={access}
        onDone={(next) => card.setData(next)}
      />

      <Sheet
        open={revokeOpen}
        onClose={() => setRevokeOpen(false)}
        title={t.laAdmRevokeTitle}
        footer={
          <div className="row g8">
            <Button variant="secondary" className="grow" onClick={() => setRevokeOpen(false)}>
              {t.cancel}
            </Button>
            <Button variant="danger" className="grow" loading={revoking} onClick={revoke}>
              {t.laAdmRevoke}
            </Button>
          </div>
        }
      >
        <p className="small pretty">{t.laAdmRevokeText}</p>
      </Sheet>
    </div>
  );
}

/* ============ Окно выдачи ============ */

/**
 * Выдать, продлить или выдать заново. Поля предзаполняются текущей выдачей:
 * продление — это правка срока, а не новая анкета. Истёкший и снятый доступ
 * срок не подставляют: прошедшую дату сервер отобьёт `422`.
 */
export function GrantLessonAiSheet({
  open,
  onClose,
  teacherId,
  current,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  teacherId: number;
  current: LessonAccess | null;
  onDone: (card: LessonAccessCard) => void;
}) {
  const { t } = useLang();
  const toast = useToast();
  const [expiresOn, setExpiresOn] = useState("");
  const [paid, setPaid] = useState(false);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    const live = current?.status === "active";
    setExpiresOn(live ? (current?.expires_on ?? "") : "");
    setPaid(current?.paid ?? false);
    setNote(current?.paid_note ?? "");
    setErrors({});
  }, [open, current]);

  const save = async () => {
    setSaving(true);
    setErrors({});
    try {
      const next = await grantLessonAccess(teacherId, {
        expires_on: expiresOn || null,
        paid,
        note: paid && note.trim() ? note.trim() : null,
      });
      toast(t.laAdmGranted, "success");
      onDone(next);
      onClose();
    } catch (e) {
      const fields = fieldErrors(e);
      if (Object.keys(fields).length) setErrors(fields);
      else toast(isApiError(e) ? e.message : t.laAdmError, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t.laAdmSheetTitle}
      footer={
        <Button block size="lg" loading={saving} onClick={save}>
          {current ? (current.status === "active" ? t.laAdmSave : t.laAdmRegrant) : t.laAdmGrant}
        </Button>
      }
    >
      <div className="stack g14">
        <Note kind="muted">
          <span className="small">{t.laAdmHint}</span>
        </Note>

        <div className="field">
          <label className="label">
            {t.laAdmExpires} <span className="label-optional">· {t.laAdmNoEnd}</span>
          </label>
          <input
            type="date"
            className={`input ${errors.expires_on ? "input-error" : ""}`}
            value={expiresOn}
            onChange={(e) => setExpiresOn(e.target.value)}
          />
          {errors.expires_on ? (
            <span className="error-text">{errors.expires_on}</span>
          ) : (
            <span className="hint">{t.laAdmExpiresHint}</span>
          )}
        </div>

        <label className="check">
          <input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} />
          <span className="check-box">
            <IconCheck size={14} />
          </span>
          <span className="check-label">{t.laAdmPaidCheck}</span>
        </label>

        <div className="field">
          <label className="label">{t.laAdmPaidNote}</label>
          <textarea
            className={`input ${errors.note ? "input-error" : ""}`}
            style={{ minHeight: 80 }}
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t.laAdmPaidNotePh}
          />
          {errors.note ? (
            <span className="error-text">{errors.note}</span>
          ) : (
            /* Сервер пишет комментарий только вместе с отметкой (`paid_note`) —
               без неё обещать сохранение нельзя */
            !paid && <span className="hint">{t.laAdmNoteOnlyPaid}</span>
          )}
        </div>
      </div>
    </Sheet>
  );
}
